import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { InputField } from '../components/InputField';
import { Modal } from '../components/Modal';
import { SelectField } from '../components/SelectField';
import { Stepper } from '../components/Stepper';
import { TextAreaField } from '../components/TextAreaField';
import {
  attendanceTypes,
  memberTypes,
  participantTypes,
  registrationSteps,
} from '../constants/participantTypes';
import { useAuth } from '../hooks/useAuth';
import { useSession } from '../hooks/useSession';
import { metadataService } from '../services/metadataService';
import { registrationService } from '../services/registrationService';
import { formatCurrency } from '../utils/currency';
import { normalizeBackendRegistration, toCustomFieldValues } from '../utils/backendMappers';

const defaultValues = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phoneNumber: '',
  countryId: '',
  city: '',
  affiliation: '',
  eventEditionId: '',
  participationType: 'attendee',
  attendanceType: 'in_person',
  memberType: 'professional',
  isIeeeMember: false,
  membershipNumber: '',
  papers: [],
};

function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerAccount } = useAuth();
  const { addRegistration, setUserProfile } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [formError, setFormError] = useState('');
  const [successState, setSuccessState] = useState(null);
  const [metadata, setMetadata] = useState({
    countries: [],
    eventEditions: [],
    customFields: {
      user: [],
      registration: [],
      article: [],
    },
  });
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
  });

  const {
    fields: paperFields,
    append: appendPaper,
    remove: removePaper,
  } = useFieldArray({
    control,
    name: 'papers',
  });

  const values = watch();
  const selectedEventEditionId = values.eventEditionId;
  const isIeeeMember = watch('isIeeeMember');

  useEffect(() => {
    async function loadMetadata() {
      try {
        setIsLoadingMetadata(true);
        const [countries, eventEditions] = await Promise.all([
          metadataService.getCountries(),
          metadataService.getActiveEventEditions(),
        ]);

        const activeEdition = eventEditions[0];
        const editionId = activeEdition?.id || '';

        const [userFields, registrationFields, articleFields] = editionId
          ? await Promise.all([
              metadataService.getCustomFields({
                eventEditionId: editionId,
                appliesTo: 'user',
              }),
              metadataService.getCustomFields({
                eventEditionId: editionId,
                appliesTo: 'registration',
              }),
              metadataService.getCustomFields({
                eventEditionId: editionId,
                appliesTo: 'article',
              }),
            ])
          : [[], [], []];

        setMetadata({
          countries,
          eventEditions,
          customFields: {
            user: userFields,
            registration: registrationFields,
            article: articleFields,
          },
        });

        if (editionId) {
          setValue('eventEditionId', String(editionId));
        }
      } catch (error) {
        setFormError(resolveApiError(error, 'No fue posible cargar los catalogos del backend.'));
      } finally {
        setIsLoadingMetadata(false);
      }
    }

    loadMetadata();
  }, [setValue]);

  useEffect(() => {
    async function reloadCustomFields() {
      if (!selectedEventEditionId) {
        return;
      }

      try {
        const [userFields, registrationFields, articleFields] = await Promise.all([
          metadataService.getCustomFields({
            eventEditionId: selectedEventEditionId,
            appliesTo: 'user',
          }),
          metadataService.getCustomFields({
            eventEditionId: selectedEventEditionId,
            appliesTo: 'registration',
          }),
          metadataService.getCustomFields({
            eventEditionId: selectedEventEditionId,
            appliesTo: 'article',
          }),
        ]);

        setMetadata((current) => ({
          ...current,
          customFields: {
            user: userFields,
            registration: registrationFields,
            article: articleFields,
          },
        }));
      } catch {
        // Keep the page usable if optional metadata refresh fails.
      }
    }

    reloadCustomFields();
  }, [selectedEventEditionId]);

  const countryOptions = useMemo(
    () =>
      metadata.countries.map((country) => ({
        value: String(country.id),
        label: country.name,
      })),
    [metadata.countries],
  );

  const eventEditionOptions = useMemo(
    () =>
      metadata.eventEditions.map((edition) => ({
        value: String(edition.id),
        label: `${edition.name} ${edition.year}`,
      })),
    [metadata.eventEditions],
  );

  const participantOptions = participantTypes.map((item) => ({
    value: item.id,
    label: item.title,
  }));

  const summaryRows = [
    { label: 'Tipo de participacion', value: labelFromOptions(values.participationType, participantOptions) },
    { label: 'Modalidad', value: labelFromOptions(values.attendanceType, attendanceTypes) },
    { label: 'Tipo de miembro', value: labelFromOptions(values.memberType, memberTypes) },
    { label: 'Articulos preparados', value: `${paperFields.length}` },
    {
      label: 'Miembro IEEE',
      value: values.isIeeeMember ? 'Si' : 'No',
    },
  ];

  const validateStep = async () => {
    const userFieldNames = [
      'firstName',
      'lastName',
      'email',
      'password',
      'phoneNumber',
      'countryId',
      'city',
      'affiliation',
      ...metadata.customFields.user.map((field) => customFieldName('user', field.id)),
    ];

    const registrationFieldNames = [
      'eventEditionId',
      'participationType',
      'attendanceType',
      'memberType',
      ...(isIeeeMember ? ['membershipNumber'] : []),
      ...metadata.customFields.registration.map((field) => customFieldName('registration', field.id)),
    ];

    const paperFieldNames = paperFields.flatMap((_, index) => [
      `papers.${index}.title`,
      `papers.${index}.paperCode`,
      `papers.${index}.authorsText`,
      `papers.${index}.pages`,
      ...metadata.customFields.article.map((field) => customFieldName(`article_${index}`, field.id)),
    ]);

    const fieldsByStep = [userFieldNames, registrationFieldNames, paperFieldNames, []];
    const valid = await trigger(fieldsByStep[currentStep]);

    if (valid) {
      setCurrentStep((step) => Math.min(step + 1, registrationSteps.length - 1));
    }
  };

  const onSubmit = async (data) => {
    try {
      setFormError('');

      const userCustomValues = toCustomFieldValues(
        metadata.customFields.user,
        collectCustomFieldValues(data, 'user'),
      );

      const registrationCustomValues = toCustomFieldValues(
        metadata.customFields.registration,
        collectCustomFieldValues(data, 'registration'),
      );

      const registeredUser = await registerAccount({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        countryId: Number(data.countryId),
        city: data.city,
        affiliation: data.affiliation,
        phoneNumber: data.phoneNumber,
        customFieldValues: userCustomValues,
      });

      const registrationPayload = {
        eventEditionId: Number(data.eventEditionId),
        participationType: data.participationType,
        attendanceType: data.attendanceType,
        memberType: data.memberType,
        isIeeeMember: Boolean(data.isIeeeMember),
        membershipNumber: data.isIeeeMember ? data.membershipNumber : '',
        status: 'submitted',
        customFieldValues: registrationCustomValues,
      };

      const createdRegistration = await registrationService.createRegistration(registrationPayload);
      const paperResponses = [];

      for (let index = 0; index < data.papers.length; index += 1) {
        const paper = data.papers[index];
        const articleCustomValues = toCustomFieldValues(
          metadata.customFields.article,
          collectCustomFieldValues(data, `article_${index}`),
        );

        const response = await registrationService.addPaper(createdRegistration.registration.id, {
          title: paper.title,
          paperCode: paper.paperCode,
          authors: paper.authorsText
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          pages: paper.pages ? Number(paper.pages) : undefined,
          customFieldValues: articleCustomValues,
        });

        paperResponses.push(response.paper);
      }

      const paymentSummaryResponse = await registrationService.getPaymentSummary(
        createdRegistration.registration.id,
      );

      const normalizedRegistration = normalizeBackendRegistration({
        registration: paymentSummaryResponse.raw.registration,
        paymentSummary: paymentSummaryResponse.raw.paymentSummary,
        papers: paperResponses,
      });

      addRegistration(normalizedRegistration);
      setUserProfile({
        ...registeredUser,
        email: data.email,
        organization: data.affiliation,
        countryId: Number(data.countryId),
      });
      setSuccessState({
        registration: normalizedRegistration,
        paymentSummary: paymentSummaryResponse.raw.paymentSummary,
      });
    } catch (error) {
      setFormError(resolveApiError(error, 'No fue posible completar el registro.'));
    }
  };

  return (
    <section className="container-shell py-16">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              Registro conectado al backend
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-slate-950">
              Crea tu cuenta e inscripcion del evento
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              Este flujo usa los endpoints reales del backend local: metadatos, alta de usuario,
              creacion de inscripcion y carga de articulos.
            </p>
          </div>

          <Stepper steps={registrationSteps} currentStep={currentStep} />

          <Card className="p-8">
            {isLoadingMetadata ? (
              <Alert
                title="Cargando metadatos"
                description="Obteniendo paises, edicion activa y campos configurados desde el backend."
                variant="info"
              />
            ) : null}

            <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
              {formError ? (
                <Alert title="Error de registro" description={formError} variant="danger" />
              ) : null}

              {currentStep === 0 ? (
                <div className="grid gap-5 md:grid-cols-2">
                  <InputField
                    label="Nombres"
                    error={errors.firstName?.message}
                    {...register('firstName', { required: 'El nombre es obligatorio' })}
                  />
                  <InputField
                    label="Apellidos"
                    error={errors.lastName?.message}
                    {...register('lastName', { required: 'El apellido es obligatorio' })}
                  />
                  <InputField
                    label="Correo electronico"
                    type="email"
                    error={errors.email?.message}
                    {...register('email', {
                      required: 'El correo es obligatorio',
                      pattern: {
                        value: /^\S+@\S+\.\S+$/,
                        message: 'Ingresa un correo valido',
                      },
                    })}
                  />
                  <InputField
                    label="Contrasena"
                    type="password"
                    error={errors.password?.message}
                    helperText="El backend exige minimo 8 caracteres."
                    {...register('password', {
                      required: 'La contrasena es obligatoria',
                      minLength: {
                        value: 8,
                        message: 'La contrasena debe tener al menos 8 caracteres',
                      },
                    })}
                  />
                  <InputField
                    label="Telefono"
                    error={errors.phoneNumber?.message}
                    {...register('phoneNumber', { required: 'El telefono es obligatorio' })}
                  />
                  <SelectField
                    label="Pais"
                    options={countryOptions}
                    error={errors.countryId?.message}
                    {...register('countryId', { required: 'El pais es obligatorio' })}
                  />
                  <InputField
                    label="Ciudad"
                    error={errors.city?.message}
                    {...register('city', { required: 'La ciudad es obligatoria' })}
                  />
                  <InputField
                    label="Afiliacion"
                    error={errors.affiliation?.message}
                    {...register('affiliation', { required: 'La afiliacion es obligatoria' })}
                  />
                  <div className="md:col-span-2">
                    <DynamicCustomFields
                      fields={metadata.customFields.user}
                      register={register}
                      errors={errors}
                      scope="user"
                    />
                  </div>
                </div>
              ) : null}

              {currentStep === 1 ? (
                <div className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <SelectField
                      label="Edicion del evento"
                      options={eventEditionOptions}
                      error={errors.eventEditionId?.message}
                      {...register('eventEditionId', {
                        required: 'La edicion del evento es obligatoria',
                      })}
                    />
                    <SelectField
                      label="Tipo de participacion"
                      options={participantOptions}
                      error={errors.participationType?.message}
                      {...register('participationType', {
                        required: 'El tipo de participacion es obligatorio',
                      })}
                    />
                    <SelectField
                      label="Modalidad"
                      options={attendanceTypes}
                      error={errors.attendanceType?.message}
                      {...register('attendanceType', {
                        required: 'La modalidad es obligatoria',
                      })}
                    />
                    <SelectField
                      label="Tipo de miembro"
                      options={memberTypes}
                      error={errors.memberType?.message}
                      {...register('memberType', {
                        required: 'El tipo de miembro es obligatorio',
                      })}
                    />
                  </div>

                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                    <input type="checkbox" className="mt-1 h-4 w-4" {...register('isIeeeMember')} />
                    <span>
                      <span className="block text-sm font-semibold text-slate-800">
                        Confirmo que soy miembro IEEE
                      </span>
                      <span className="block text-sm text-slate-500">
                        Si activas esta opcion, el backend recibira `isIeeeMember=true`.
                      </span>
                    </span>
                  </label>

                  {isIeeeMember ? (
                    <InputField
                      label="Numero de membresia IEEE"
                      error={errors.membershipNumber?.message}
                      {...register('membershipNumber', {
                        validate: (value) =>
                          isIeeeMember && !value
                            ? 'El numero de membresia es obligatorio'
                            : true,
                      })}
                    />
                  ) : null}

                  <DynamicCustomFields
                    fields={metadata.customFields.registration}
                    register={register}
                    errors={errors}
                    scope="registration"
                  />
                </div>
              ) : null}

              {currentStep === 2 ? (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-950">Articulos</h2>
                      <p className="text-sm text-slate-500">
                        Cada articulo se envia al backend despues de crear la inscripcion.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        appendPaper({
                          title: '',
                          paperCode: '',
                          authorsText: '',
                          pages: '',
                        })
                      }
                    >
                      Agregar articulo
                    </Button>
                  </div>

                  {!paperFields.length ? (
                    <Alert
                      title="Sin articulos cargados"
                      description="Puedes continuar sin articulos si el participante solo asistira al evento."
                      variant="info"
                    />
                  ) : null}

                  {paperFields.map((paper, index) => (
                    <Card key={paper.id} className="border border-slate-100 bg-slate-50 p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold text-slate-950">
                          Articulo {index + 1}
                        </h3>
                        <Button
                          type="button"
                          variant="ghost"
                          className="border border-slate-200"
                          onClick={() => removePaper(index)}
                        >
                          Eliminar
                        </Button>
                      </div>

                      <div className="grid gap-5 md:grid-cols-2">
                        <InputField
                          label="Titulo"
                          className="md:col-span-2"
                          error={errors.papers?.[index]?.title?.message}
                          {...register(`papers.${index}.title`, {
                            required: 'El titulo es obligatorio',
                          })}
                        />
                        <InputField
                          label="Codigo del articulo"
                          error={errors.papers?.[index]?.paperCode?.message}
                          helperText="Debe ser unico en backend."
                          {...register(`papers.${index}.paperCode`, {
                            required: 'El codigo es obligatorio',
                          })}
                        />
                        <InputField
                          label="Paginas"
                          type="number"
                          min="1"
                          error={errors.papers?.[index]?.pages?.message}
                          {...register(`papers.${index}.pages`, {
                            min: {
                              value: 1,
                              message: 'Debe ser mayor que cero',
                            },
                          })}
                        />
                        <TextAreaField
                          label="Autores"
                          className="md:col-span-2"
                          error={errors.papers?.[index]?.authorsText?.message}
                          placeholder="Separa los autores por coma"
                          {...register(`papers.${index}.authorsText`, {
                            required: 'Debes ingresar al menos un autor',
                            validate: (value) =>
                              value
                                .split(',')
                                .map((item) => item.trim())
                                .filter(Boolean).length
                                ? true
                                : 'Debes ingresar al menos un autor valido',
                          })}
                        />
                      </div>

                      <div className="mt-5">
                        <DynamicCustomFields
                          fields={metadata.customFields.article}
                          register={register}
                          errors={errors}
                          scope={`article_${index}`}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : null}

              {currentStep === 3 ? (
                <div className="space-y-6">
                  <Alert
                    title="Resumen conectado al backend"
                    description="El costo definitivo no se calcula localmente. El backend lo resolvera con las reglas activas de pricing cuando completes el envio."
                    variant="info"
                  />
                  <div className="grid gap-4">
                    {summaryRows.map((row) => (
                      <SummaryRow key={row.label} label={row.label} value={row.value} />
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap justify-between gap-4 border-t border-slate-200 pt-6">
                <Button
                  type="button"
                  variant="ghost"
                  className="border border-slate-200"
                  onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
                  disabled={currentStep === 0}
                >
                  Atras
                </Button>
                {currentStep < registrationSteps.length - 1 ? (
                  <Button type="button" variant="primary" onClick={validateStep}>
                    Continuar
                  </Button>
                ) : (
                  <Button type="submit" variant="accent" disabled={isSubmitting || isLoadingMetadata}>
                    {isSubmitting ? 'Enviando...' : 'Crear cuenta e inscripcion'}
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-24 p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              Payload esperado
            </p>
            <div className="mt-6 space-y-4 text-sm text-slate-600">
              <SummaryRow label="POST /auth/register" value="usuario + token" />
              <SummaryRow label="POST /registrations" value="inscripcion autenticada" />
              <SummaryRow label="POST /registrations/:id/papers" value={`${paperFields.length} articulos`} />
              <SummaryRow label="GET /registrations/:id/payment-summary" value="resumen final" />
            </div>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={Boolean(successState)}
        title="Registro creado correctamente"
        onClose={() => setSuccessState(null)}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            La cuenta, la inscripcion y los articulos fueron enviados al backend local.
          </p>
          {successState ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <p>
                <span className="font-semibold">ID de inscripcion:</span>{' '}
                {successState.registration.id}
              </p>
              <p>
                <span className="font-semibold">Estado de pago:</span>{' '}
                {successState.registration.paymentStatus}
              </p>
              <p>
                <span className="font-semibold">Saldo pendiente:</span>{' '}
                {formatCurrency(successState.paymentSummary.pendingAmount)}
              </p>
            </div>
          ) : null}
          <div className="flex gap-3">
            <Button variant="primary" onClick={() => navigate('/dashboard')}>
              Ir al panel
            </Button>
            <Button
              variant="ghost"
              className="border border-slate-200"
              onClick={() => {
                setSuccessState(null);
                reset(defaultValues);
                setCurrentStep(0);
              }}
            >
              Crear otro
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

function DynamicCustomFields({ fields, register, errors, scope }) {
  if (!fields.length) {
    return null;
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {fields.map((field) => {
        const name = customFieldName(scope, field.id);
        const error = getNestedError(errors, name)?.message;
        const rules = field.isRequired ? { required: `${field.label} es obligatorio` } : {};

        if (field.fieldType === 'textarea') {
          return (
            <TextAreaField
              key={field.id}
              label={field.label}
              className="md:col-span-2"
              error={error}
              {...register(name, rules)}
            />
          );
        }

        if (field.fieldType === 'select') {
          const options = Array.isArray(field.optionsJson)
            ? field.optionsJson.map((option) => ({
                value: String(option.value ?? option),
                label: String(option.label ?? option),
              }))
            : [];

          return (
            <SelectField
              key={field.id}
              label={field.label}
              options={options}
              error={error}
              {...register(name, rules)}
            />
          );
        }

        if (field.fieldType === 'checkbox') {
          return (
            <label
              key={field.id}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 md:col-span-2"
            >
              <input type="checkbox" className="mt-1 h-4 w-4" {...register(name)} />
              <span>
                <span className="block text-sm font-semibold text-slate-800">{field.label}</span>
                {error ? <span className="mt-1 block text-sm text-rose-600">{error}</span> : null}
              </span>
            </label>
          );
        }

        return (
          <InputField
            key={field.id}
            label={field.label}
            type={resolveInputType(field.fieldType)}
            error={error}
            {...register(name, rules)}
          />
        );
      })}
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-950">{value || 'Pendiente'}</span>
    </div>
  );
}

function customFieldName(scope, id) {
  return `customFields.${scope}.${id}`;
}

function collectCustomFieldValues(data, scope) {
  return data.customFields?.[scope] || {};
}

function getNestedError(errors, path) {
  return path.split('.').reduce((accumulator, key) => accumulator?.[key], errors);
}

function resolveInputType(fieldType) {
  switch (fieldType) {
    case 'email':
      return 'email';
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    default:
      return 'text';
  }
}

function labelFromOptions(value, options) {
  return options.find((option) => option.value === value)?.label || value || 'Pendiente';
}

function resolveApiError(error, fallbackMessage) {
  const apiMessage = error?.response?.data?.message;
  const validationErrors = error?.response?.data?.errors;

  if (Array.isArray(validationErrors) && validationErrors.length) {
    return validationErrors.map((item) => item.msg || item.message).join(' ');
  }

  return apiMessage || error.message || fallbackMessage;
}

export default RegisterPage;
