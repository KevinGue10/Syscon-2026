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
  documentTypeOptions,
  genderOptions,
  occupationTypes,
  participantTypes,
  registrationSteps,
} from '../constants/participantTypes';
import { useAuth } from '../hooks/useAuth';
import { useSession } from '../hooks/useSession';
import { metadataService } from '../services/metadataService';
import { registrationService } from '../services/registrationService';
import { formatCurrency } from '../utils/currency';
import { normalizeBackendRegistration, toCustomFieldValues } from '../utils/backendMappers';
import { translatePaymentStatus } from '../utils/translations';

const defaultValues = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phoneNumber: '',
  countryId: '',
  city: '',
  address: '',
  birthDate: '',
  gender: '',
  docType: '',
  docNumber: '',
  affiliation: '',
  occupation: '',
  eventEditionId: '',
  participationType: 'attendee',
  attendanceType: 'in_person',
  registrationCategory: 'professional',
  isIeeeMember: false,
  isTems: false,
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
  const [paymentPreview, setPaymentPreview] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
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
    getValues,
    reset,
    setError,
    setValue,
    trigger,
    watch,
    clearErrors,
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
  const isTems = watch('isTems');
  const shouldShowArticlesStep = values.participationType !== 'attendee';
  const stepSequence = shouldShowArticlesStep ? [0, 1, 2, 3] : [0, 1, 3];
  const visibleSteps = stepSequence.map((stepIndex) => registrationSteps[stepIndex]);
  const visibleCurrentStep = Math.max(stepSequence.indexOf(currentStep), 0);
  const isFinalStep = currentStep === stepSequence[stepSequence.length - 1];

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

  useEffect(() => {
    if (!isIeeeMember && isTems) {
      setValue('isTems', false);
    }
  }, [isIeeeMember, isTems, setValue]);

  useEffect(() => {
    if (!shouldShowArticlesStep && currentStep === 2) {
      setCurrentStep(3);
    }
  }, [currentStep, shouldShowArticlesStep]);

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
    { label: 'Tipo de participación', value: labelFromOptions(values.participationType, participantOptions) },
    { label: 'Modalidad', value: labelFromOptions(values.attendanceType, attendanceTypes) },
    {
      label: 'Categoría de inscripción',
      value: labelFromOptions(values.registrationCategory, occupationTypes),
    },
    { label: 'Artículos preparados', value: `${shouldShowArticlesStep ? paperFields.length : 0}` },
    {
      label: 'Miembro IEEE',
      value: values.isIeeeMember ? 'Sí' : 'No',
    },
    {
      label: 'Miembro TEMS',
      value: isTems ? 'Sí' : 'No',
    },
  ];

  const guidanceItems = [
    {
      title: 'Información personal',
      description:
        'Ingresa los datos del participante tal como deben quedar en el registro oficial del evento.',
    },
    {
      title: 'Datos de inscripción',
      description:
        'Selecciona modalidad, tipo de participación y perfil de miembro para calcular la tarifa correspondiente.',
    },
    {
      title: 'Artículos y soporte',
      description:
        'Si vas a registrar ponencias o artículos, ten a mano el código, autores y número de páginas.',
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
      'address',
      'birthDate',
      'gender',
      'docType',
      'docNumber',
      'affiliation',
      'occupation',
      ...metadata.customFields.user.map((field) => customFieldName('user', field.id)),
    ];

    const registrationFieldNames = [
      'eventEditionId',
      'participationType',
      'attendanceType',
      'registrationCategory',
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

    const fieldsByStep = {
      0: userFieldNames,
      1: registrationFieldNames,
      2: paperFieldNames,
      3: [],
    };
    const valid = await trigger(fieldsByStep[currentStep] || []);

    if (valid) {
      const currentSequenceIndex = stepSequence.indexOf(currentStep);
      const nextStep = stepSequence[Math.min(currentSequenceIndex + 1, stepSequence.length - 1)];
      const shouldBuildPreview = nextStep === 3;

      if (shouldBuildPreview) {
        try {
          setIsPreviewLoading(true);
          setFormError('');

          const previewResponse = await registrationService.previewPaymentSummary(
            buildPaymentPreviewPayload(getValues()),
          );

          setPaymentPreview(previewResponse.paymentSummary);
        } catch (error) {
          setFormError(
            resolveApiError(error, 'No fue posible calcular el saldo pendiente antes de continuar.'),
          );
          return;
        } finally {
          setIsPreviewLoading(false);
        }
      }

      setCurrentStep(nextStep);
    }
  };

  const onSubmit = async (data) => {
    if (!isFinalStep) {
      await validateStep();
      return;
    }

    try {
      clearErrors();
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
        address: data.address,
        birthDate: data.birthDate,
        gender: data.gender,
        docType: data.docType,
        docNumber: data.docNumber,
        affiliation: data.affiliation,
        phoneNumber: data.phoneNumber,
        occupation: data.occupation,
        customFieldValues: userCustomValues,
      });

      const registrationPayload = {
        eventEditionId: Number(data.eventEditionId),
        participationType: data.participationType,
        attendanceType: data.attendanceType,
        memberType: resolveMemberType({
          occupation: data.registrationCategory,
          isIeeeMember: data.isIeeeMember,
        }),
        isIeeeMember: Boolean(data.isIeeeMember),
        isTems: Boolean(data.isTems),
        membershipNumber: data.isIeeeMember ? data.membershipNumber : '',
        status: 'submitted',
        customFieldValues: registrationCustomValues,
      };

      const createdRegistration = await registrationService.createRegistration(registrationPayload);
      const effectivePapers = shouldShowArticlesStep ? data.papers : [];
      const paperResponses = [];

      for (let index = 0; index < effectivePapers.length; index += 1) {
        const paper = effectivePapers[index];
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
      const paymentSummaryData =
        paymentSummaryResponse.raw.data?.paymentSummary || paymentSummaryResponse.raw.paymentSummary;
      const registrationData =
        paymentSummaryResponse.raw.data?.registration || paymentSummaryResponse.raw.registration;

      const normalizedRegistration = normalizeBackendRegistration({
        registration: registrationData,
        paymentSummary: paymentSummaryData,
        papers: paperResponses,
      });

      addRegistration(normalizedRegistration);
      setUserProfile({
        ...registeredUser,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        city: data.city,
        address: data.address,
        birthDate: data.birthDate,
        gender: data.gender,
        docType: data.docType,
        docNumber: data.docNumber,
        affiliation: data.affiliation,
        occupation: data.occupation,
        organization: data.affiliation,
        countryId: Number(data.countryId),
      });
      setSuccessState({
        registration: normalizedRegistration,
        paymentSummary: paymentSummaryData,
        message:
          paymentSummaryResponse.raw?.message ||
          'La cuenta y la inscripción fueron creadas correctamente.',
      });
      setPaymentPreview(paymentSummaryData);
    } catch (error) {
      applyBackendErrors({
        error,
        setError,
        setFormError,
        fallbackMessage: 'No fue posible completar el registro.',
      });
    }
  };

  const submitRegistration = handleSubmit(onSubmit);

  return (
    <section className="container-shell py-16">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              Formulario de inscripción
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-slate-950">
              Completa tu registro para participar en TEMSCON LATAM 2026
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              Diligencia tu información personal, define el tipo de participación y agrega los
              artículos que vayas a presentar. Al finalizar, tu inscripción quedará asociada a la
              cuenta creada en la plataforma.
            </p>
          </div>

          <Stepper steps={visibleSteps} currentStep={visibleCurrentStep} />

          <Card className="p-8">
            {isLoadingMetadata ? (
              <Alert
                title="Cargando metadatos"
                description="Obteniendo países, edición activa y campos configurados desde el backend."
                variant="info"
              />
            ) : null}

            <form
              className="space-y-8"
              onSubmit={(event) => event.preventDefault()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
                  event.preventDefault();

                  if (isFinalStep) {
                    submitRegistration();
                  } else {
                    validateStep();
                  }
                }
              }}
            >
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
                    {...register('lastName', { required: 'Los apellidos son obligatorios' })}
                  />
                  <InputField
                    label="Correo electrónico"
                    type="email"
                    error={errors.email?.message}
                    {...register('email', {
                      required: 'El correo es obligatorio',
                      pattern: {
                        value: /^\S+@\S+\.\S+$/,
                        message: 'Ingresa un correo válido',
                      },
                    })}
                  />
                  <InputField
                    label="Contraseña"
                    type="password"
                    error={errors.password?.message}
                    helperText="Debe tener al menos 8 caracteres."
                    {...register('password', {
                      required: 'La contraseña es obligatoria',
                      minLength: {
                        value: 8,
                        message: 'La contraseña debe tener al menos 8 caracteres',
                      },
                    })}
                  />
                  <InputField
                    label="Teléfono"
                    error={errors.phoneNumber?.message}
                    {...register('phoneNumber', { required: 'El teléfono es obligatorio' })}
                  />
                  <SelectField
                    label="País"
                    options={countryOptions}
                    error={errors.countryId?.message}
                    {...register('countryId', { required: 'El país es obligatorio' })}
                  />
                  <InputField
                    label="Ciudad"
                    error={errors.city?.message}
                    {...register('city', { required: 'La ciudad es obligatoria' })}
                  />
                  <InputField
                    label="Dirección"
                    error={errors.address?.message}
                    {...register('address', { required: 'La dirección es obligatoria' })}
                  />
                  <InputField
                    label="Fecha de nacimiento"
                    type="date"
                    error={errors.birthDate?.message}
                    {...register('birthDate', {
                      required: 'La fecha de nacimiento es obligatoria',
                    })}
                  />
                  <SelectField
                    label="Género"
                    options={genderOptions}
                    error={errors.gender?.message}
                    {...register('gender', { required: 'El género es obligatorio' })}
                  />
                  <SelectField
                    label="Tipo de documento"
                    options={documentTypeOptions}
                    error={errors.docType?.message}
                    {...register('docType', {
                      required: 'El tipo de documento es obligatorio',
                    })}
                  />
                  <InputField
                    label="Número de documento"
                    error={errors.docNumber?.message}
                    {...register('docNumber', {
                      required: 'El número de documento es obligatorio',
                    })}
                  />
                  <InputField
                    label="Afiliación"
                    helperText="Ingresa la entidad, institución o empresa a la que estás afiliado."
                    error={errors.affiliation?.message}
                    {...register('affiliation', { required: 'La afiliación es obligatoria' })}
                  />
                  <InputField
                    label="Ocupación"
                    helperText="Indica a qué te dedicas o cuál es tu actividad principal."
                    placeholder="Ejemplo: Engineer"
                    error={errors.occupation?.message}
                    {...register('occupation', {
                      required: 'La ocupación es obligatoria',
                    })}
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
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-semibold text-slate-700">Conferencia</span>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">
                          {eventEditionOptions[0]?.label || 'TEMSCON LATAM 2026'}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Esta inscripción corresponde a la edición activa del evento.
                        </p>
                      </div>
                    </div>
                    <SelectField
                      label="Tipo de participación"
                      options={participantOptions}
                      error={errors.participationType?.message}
                      {...register('participationType', {
                        required: 'El tipo de participación es obligatorio',
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
                      label="Categoría de inscripción"
                      options={occupationTypes}
                      error={errors.registrationCategory?.message}
                      {...register('registrationCategory', {
                        required: 'La categoría de inscripción es obligatoria',
                      })}
                    />
                  </div>

                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                    <input type="checkbox" className="mt-1 h-4 w-4" {...register('isIeeeMember')} />
                    <span>
                      <span className="block text-sm font-semibold text-slate-800">
                        Confirmo que soy miembro IEEE
                      </span>
                    </span>
                  </label>

                  {isIeeeMember ? (
                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                      <input type="checkbox" className="mt-1 h-4 w-4" {...register('isTems')} />
                      <span>
                        <span className="block text-sm font-semibold text-slate-800">
                          Confirmo que soy miembro TEMS
                        </span>
                      </span>
                    </label>
                  ) : null}

                  {isIeeeMember ? (
                    <InputField
                      label="Número de membresía IEEE"
                      error={errors.membershipNumber?.message}
                      {...register('membershipNumber', {
                        validate: (value) =>
                          isIeeeMember && !value
                            ? 'El número de membresía es obligatorio'
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

              {currentStep === 2 && shouldShowArticlesStep ? (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-950">Artículos</h2>
                      <p className="mt-2 text-sm leading-7 text-slate-500">
                        Agrega nuevos artículos antes de finalizar tu registro.
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
                      Agregar artículo
                    </Button>
                  </div>

                  {!paperFields.length ? (
                    <Alert
                      title="Sin artículos cargados"
                      description="Puedes continuar sin artículos si el participante solo asistirá al evento."
                      variant="info"
                    />
                  ) : null}

                  {paperFields.map((paper, index) => (
                    <Card key={paper.id} className="border border-slate-100 bg-slate-50 p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold text-slate-950">
                          Artículo {index + 1}
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
                          label="Título"
                          className="md:col-span-2"
                          error={errors.papers?.[index]?.title?.message}
                          {...register(`papers.${index}.title`, {
                            required: 'El título es obligatorio',
                          })}
                        />
                        <InputField
                          label="Código del artículo"
                          error={errors.papers?.[index]?.paperCode?.message}
                          helperText="Debe ser único en backend."
                          {...register(`papers.${index}.paperCode`, {
                            required: 'El código es obligatorio',
                          })}
                        />
                        <InputField
                          label="Páginas"
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
                                : 'Debes ingresar al menos un autor válido',
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
                    title="Resumen de inscripción"
                    description="Revisa la información antes de finalizar el registro. Este resumen de pago se recalculó con la información actual del formulario."
                    variant="info"
                  />
                  <div className="grid gap-4">
                    {summaryRows.map((row) => (
                      <SummaryRow key={row.label} label={row.label} value={row.value} />
                    ))}
                    <SummaryRow
                      label="Estado de pago"
                      value={translatePaymentStatus(paymentPreview?.paymentStatus)}
                    />
                    <SummaryRow
                      label="Saldo pendiente"
                      value={formatCurrency(paymentPreview?.pendingAmount || 0)}
                    />
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap justify-between gap-4 border-t border-slate-200 pt-6">
                <Button
                  type="button"
                  variant="ghost"
                  className="border border-slate-200"
                  onClick={() => {
                    const currentSequenceIndex = stepSequence.indexOf(currentStep);
                    const previousStep = stepSequence[Math.max(currentSequenceIndex - 1, 0)];
                    setCurrentStep(previousStep);
                  }}
                  disabled={currentStep === 0}
                >
                  Atrás
                </Button>
                {!isFinalStep ? (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={validateStep}
                    disabled={isPreviewLoading}
                  >
                    {isPreviewLoading ? 'Calculando...' : 'Continuar'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="accent"
                    disabled={isSubmitting || isLoadingMetadata || isPreviewLoading}
                    onClick={submitRegistration}
                  >
                    {isSubmitting ? 'Enviando...' : 'Crear cuenta e inscripción'}
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-24 overflow-hidden border-none bg-[#13253d] p-8 text-white shadow-[0_30px_80px_rgba(19,37,61,0.32)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,74,74,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(57,141,222,0.18),transparent_30%)]" />
            <div className="relative">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#9ec5ff]">
              Antes de continuar
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              Prepara tu información para agilizar el proceso
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/78">
              El formulario se completa por etapas. Puedes avanzar paso a paso y registrar la
              información clave del participante y, si aplica, de los artículos asociados.
            </p>
            <div className="mt-6 space-y-4">
              {guidanceItems.map((item, index) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/6 px-5 py-4 backdrop-blur-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff9a9a]">
                    Paso recomendado {index + 1}
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-white/72">{item.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-dashed border-[#ff6b6b]/55 bg-[#0f1d30]/70 px-5 py-4">
              <p className="text-sm font-semibold text-white">
                  Artículos agregados actualmente: {shouldShowArticlesStep ? paperFields.length : 0}
              </p>
              <p className="mt-1 text-sm text-white/72">
                Si el participante solo asistirá al evento, puedes continuar sin registrar
                artículos.
              </p>
            </div>
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
            {successState?.message || 'La cuenta y la inscripción fueron procesadas correctamente.'}
          </p>
          {successState ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <p>
                <span className="font-semibold">Estado de pago:</span>{' '}
                {translatePaymentStatus(successState.registration.paymentStatus)}
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

function buildPaymentPreviewPayload(data) {
  const shouldIncludePapers = data.participationType !== 'attendee';

  return {
    eventEditionId: Number(data.eventEditionId),
    participationType: data.participationType,
    memberType: resolveMemberType({
      occupation: data.registrationCategory,
      isIeeeMember: data.isIeeeMember,
    }),
    isIeeeMember: Boolean(data.isIeeeMember),
    isTems: Boolean(data.isTems),
    papers: (shouldIncludePapers ? data.papers || [] : []).map((paper) => ({
      pages: paper.pages ? Number(paper.pages) : 0,
    })),
  };
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

function resolveMemberType({ occupation, isIeeeMember }) {
  if (occupation === 'student') {
    return 'student';
  }

  return isIeeeMember ? 'ieee_member' : 'non_ieee_member';
}

function labelFromOptions(value, options) {
  return options.find((option) => option.value === value)?.label || value || 'Pendiente';
}

function applyBackendErrors({ error, setError, setFormError, fallbackMessage }) {
  const apiMessage = error?.response?.data?.message;
  const validationErrors = error?.response?.data?.errors;

  if (Array.isArray(validationErrors) && validationErrors.length) {
    let hasFieldErrors = false;

    validationErrors.forEach((item) => {
      const fieldPath = mapBackendFieldToFormField(item.field);
      const message = item.message || item.msg;

      if (fieldPath) {
        setError(fieldPath, {
          type: 'server',
          message,
        });
        hasFieldErrors = true;
      }
    });

    setFormError(
      hasFieldErrors
        ? apiMessage || 'Revisa los campos marcados para continuar.'
        : validationErrors.map((item) => item.message || item.msg).join(' '),
    );
    return;
  }

  if (apiMessage?.toLowerCase().includes('email is already registered')) {
    setError('email', {
      type: 'server',
      message: 'Este correo ya se encuentra registrado.',
    });
    setFormError('Este correo ya se encuentra registrado.');
    return;
  }

  setFormError(apiMessage || error.message || fallbackMessage);
}

function mapBackendFieldToFormField(field) {
  const fieldMap = {
    firstName: 'firstName',
    lastName: 'lastName',
    email: 'email',
    password: 'password',
    countryId: 'countryId',
    city: 'city',
    address: 'address',
    birthDate: 'birthDate',
    gender: 'gender',
    docType: 'docType',
    docNumber: 'docNumber',
    affiliation: 'affiliation',
    phoneNumber: 'phoneNumber',
    occupation: 'occupation',
    participationType: 'participationType',
    attendanceType: 'attendanceType',
    memberType: 'registrationCategory',
    membershipNumber: 'membershipNumber',
    eventEditionId: 'eventEditionId',
  };

  return fieldMap[field] || null;
}

export default RegisterPage;
