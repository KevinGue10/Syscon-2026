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
import { useSession } from '../hooks/useSession';
import { dashboardService } from '../services/dashboardService';
import { metadataService } from '../services/metadataService';
import { registrationService } from '../services/registrationService';
import { formatCurrency } from '../utils/currency';
import { toCustomFieldValues } from '../utils/backendMappers';
import { translatePaymentStatus } from '../utils/translations';

const defaultValues = {
  firstName: '',
  lastName: '',
  email: '',
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
  membershipNumber: '',
  customFields: {
    registration: {},
  },
  papers: [],
};

function EditRegistrationPage() {
  const navigate = useNavigate();
  const { setUserProfile, setRegistrations } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [formError, setFormError] = useState('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [paymentPreview, setPaymentPreview] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [pageState, setPageState] = useState({
    isLoading: true,
    user: null,
    registration: null,
  });
  const [metadata, setMetadata] = useState({
    countries: [],
    customFields: {
      registration: [],
      article: [],
    },
  });
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    setError,
    setValue,
    trigger,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
  });
  const {
    fields: paperFields,
    append: appendPaper,
    remove: removePaperField,
  } = useFieldArray({
    control,
    name: 'papers',
  });

  const values = watch();
  const isIeeeMember = watch('isIeeeMember');
  const shouldShowArticlesStep = values.participationType !== 'attendee';
  const stepSequence = shouldShowArticlesStep ? [0, 1, 2, 3] : [0, 1, 3];
  const visibleSteps = stepSequence.map((stepIndex) => registrationSteps[stepIndex]);
  const visibleCurrentStep = Math.max(stepSequence.indexOf(currentStep), 0);
  const isFinalStep = currentStep === stepSequence[stepSequence.length - 1];

  useEffect(() => {
    async function loadPage() {
      try {
        setPageState((current) => ({
          ...current,
          isLoading: true,
        }));

        const [detailsResponse, countries] = await Promise.all([
          dashboardService.getMyRegistrationDetails(),
          metadataService.getCountries(),
        ]);

        const activeRegistration = detailsResponse.registrations?.[0] || null;

        if (!activeRegistration || !detailsResponse.user) {
          setPageState({
            isLoading: false,
            user: null,
            registration: null,
          });
          setMetadata({
            countries,
            customFields: {
              registration: [],
              article: [],
            },
          });
          return;
        }

        const [registrationFields, articleFields] = activeRegistration.eventEditionId
          ? await Promise.all([
              metadataService.getCustomFields({
                eventEditionId: activeRegistration.eventEditionId,
                appliesTo: 'registration',
              }),
              metadataService.getCustomFields({
                eventEditionId: activeRegistration.eventEditionId,
                appliesTo: 'article',
              }),
            ])
          : [[], []];

        setMetadata({
          countries,
          customFields: {
            registration: registrationFields,
            article: articleFields,
          },
        });

        setPageState({
          isLoading: false,
          user: detailsResponse.user,
          registration: activeRegistration,
        });
        setPaymentPreview(
          activeRegistration.paymentSummary ||
            activeRegistration.pricing?.breakdown || {
              pendingAmount: activeRegistration.pendingAmount || 0,
              paymentStatus: activeRegistration.paymentStatus,
            },
        );

        reset(buildFormValues(detailsResponse.user, activeRegistration, registrationFields, articleFields));
      } catch (error) {
        setFormError(
          resolveApiError(error, 'No fue posible cargar la información actual de tu inscripción.'),
        );
        setPageState({
          isLoading: false,
          user: null,
          registration: null,
        });
      }
    }

    loadPage();
  }, [reset]);

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

  const participantOptions = participantTypes.map((item) => ({
    value: item.id,
    label: item.title,
  }));

  const guidanceItems = [
    {
      title: 'Actualiza tus datos personales',
      description:
        'Corrige la información visible de tu perfil para que tu inscripción quede clara y consistente.',
    },
    {
      title: 'Ajusta tu modalidad de inscripción',
      description:
        'Puedes revisar el tipo de participación, la modalidad y tu categoría para mantener vigente tu registro.',
    },
    {
      title: 'Confirma tu información actual',
      description:
        'Antes de guardar, revisa el resumen final para validar que todo quede como esperas.',
    },
  ];

  const summaryRows = [
    { label: 'Tipo de participación', value: labelFromOptions(values.participationType, participantOptions) },
    { label: 'Modalidad', value: labelFromOptions(values.attendanceType, attendanceTypes) },
    {
      label: 'Categoría de inscripción',
      value: labelFromOptions(values.registrationCategory, occupationTypes),
    },
    {
      label: 'Miembro IEEE',
      value: values.isIeeeMember ? 'Sí' : 'No',
    },
    {
      label: 'Artículos registrados',
      value: `${shouldShowArticlesStep ? paperFields.length || 0 : 0}`,
    },
  ];

  const validateStep = async () => {
    const userFieldNames = [
      'firstName',
      'lastName',
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
    ];

    const registrationFieldNames = [
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
      const shouldBuildPreview = nextStep === 3 && pageState.registration;

      if (shouldBuildPreview) {
        try {
          setIsPreviewLoading(true);
          setFormError('');

          const previewResponse = await registrationService.previewPaymentSummary(
            buildPaymentPreviewPayload(getValues()),
            pageState.registration.id,
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
    if (!isFinalStep || !pageState.registration) {
      await validateStep();
      return;
    }

    try {
      setFormError('');

      const registrationCustomValues = toCustomFieldValues(
        metadata.customFields.registration,
        collectCustomFieldValues(data, 'registration'),
      );

      const updateResponse = await registrationService.updateRegistration(pageState.registration.id, {
        firstName: data.firstName,
        lastName: data.lastName,
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
        eventEditionId: Number(data.eventEditionId),
        participationType: data.participationType,
        attendanceType: data.attendanceType,
        memberType: resolveMemberType({
          occupation: data.registrationCategory,
          isIeeeMember: data.isIeeeMember,
        }),
        isIeeeMember: Boolean(data.isIeeeMember),
        membershipNumber: data.isIeeeMember ? data.membershipNumber : '',
        status: pageState.registration.status,
        customFieldValues: registrationCustomValues,
      });

      const effectivePapers = shouldShowArticlesStep ? data.papers || [] : [];
      const originalPaperIds = (pageState.registration.papers || [])
        .map((paper) => paper.id)
        .filter(Boolean);
      const currentExistingPaperIds = effectivePapers
        .map((paper) => paper.existingPaperId)
        .filter(Boolean);
      const papersToDelete = originalPaperIds.filter(
        (paperId) => !currentExistingPaperIds.includes(paperId),
      );

      for (const paperId of papersToDelete) {
        await registrationService.deletePaper(paperId);
      }

      for (let index = 0; index < effectivePapers.length; index += 1) {
        const paper = effectivePapers[index];
        const originalPaper = (pageState.registration.papers || []).find(
          (item) => String(item.id) === String(paper.existingPaperId),
        );
        const shouldReplaceExistingPaper =
          Boolean(paper.existingPaperId) &&
          didPaperChange(originalPaper, paper);

        const articleCustomValues = toCustomFieldValues(
          metadata.customFields.article,
          collectCustomFieldValues(data, `article_${index}`),
        );

        if (paper.existingPaperId && !shouldReplaceExistingPaper) {
          continue;
        }

        if (paper.existingPaperId && shouldReplaceExistingPaper) {
          await registrationService.deletePaper(paper.existingPaperId);
        }

        await registrationService.addPaper(pageState.registration.id, {
          title: paper.title,
          paperCode: paper.paperCode,
          authors: paper.authorsText
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          pages: paper.pages ? Number(paper.pages) : undefined,
          customFieldValues: articleCustomValues,
        });
      }

      const updatedUser = updateResponse.user || {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
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
        country:
          metadata.countries.find((country) => String(country.id) === String(data.countryId))?.name || '',
      };

      setUserProfile(updatedUser);

      const refreshedDetails = await dashboardService.getMyRegistrationDetails();
      setRegistrations(refreshedDetails.registrations || []);
      const refreshedRegistration = refreshedDetails.registrations?.[0] || pageState.registration;
      setPageState((current) => ({
        ...current,
        user: refreshedDetails.user || current.user,
        registration: refreshedRegistration,
      }));
      setPaymentPreview(
        refreshedRegistration?.paymentSummary ||
          refreshedRegistration?.pricing?.breakdown || {
            pendingAmount: refreshedRegistration?.pendingAmount || 0,
            paymentStatus: refreshedRegistration?.paymentStatus,
          },
      );
      setIsSuccessModalOpen(true);
    } catch (error) {
      applyBackendErrors({
        error,
        setError,
        setFormError,
        fallbackMessage: 'No fue posible guardar los cambios de tu inscripción.',
      });
    }
  };

  const submitEdition = handleSubmit(onSubmit);

  if (pageState.isLoading) {
    return (
      <section className="container-shell py-16">
        <Alert
          title="Cargando edición de inscripción"
          description="Estamos preparando tu información actual para que puedas revisarla y ajustarla."
          variant="info"
        />
      </section>
    );
  }

  if (!pageState.user || !pageState.registration) {
    return (
      <section className="container-shell py-16">
        <Alert
          title="No encontramos una inscripción activa"
          description="Cuando tengas una inscripción registrada, podrás editarla desde esta misma pantalla."
          variant="warning"
        />
      </section>
    );
  }

  return (
    <section className="container-shell py-16">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              Editar información
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-slate-950">
              Actualiza tu inscripción de IEEE SYSCON LATAM 2026
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              Revisa la información cargada en tu cuenta, ajusta los datos que necesites y guarda
              los cambios para mantener tu inscripción al día.
            </p>
          </div>

          <Stepper steps={visibleSteps} currentStep={visibleCurrentStep} />

          <Card className="p-8">
            <form
              className="space-y-8"
              onSubmit={(event) => event.preventDefault()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
                  event.preventDefault();

                  if (isFinalStep) {
                    submitEdition();
                  } else {
                    validateStep();
                  }
                }
              }}
            >
              {formError ? (
                <Alert title="No fue posible guardar los cambios" description={formError} variant="danger" />
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
                    readOnly
                    helperText="Este es el correo con el que accedes actualmente a la plataforma."
                    {...register('email')}
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
                    {...register('birthDate', { required: 'La fecha de nacimiento es obligatoria' })}
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
                    {...register('docType', { required: 'El tipo de documento es obligatorio' })}
                  />
                  <InputField
                    label="Número de documento"
                    error={errors.docNumber?.message}
                    {...register('docNumber', { required: 'El número de documento es obligatorio' })}
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
                    error={errors.occupation?.message}
                    {...register('occupation', { required: 'La ocupación es obligatoria' })}
                  />
                </div>
              ) : null}

              {currentStep === 1 ? (
                <div className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-semibold text-slate-700">Conferencia</span>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">
                          {pageState.registration.eventEdition?.name || 'IEEE SYSCON LATAM 2026'}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Tu inscripción se encuentra asociada a esta edición activa del evento.
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
                    <span className="block text-sm font-semibold text-slate-800">
                      Confirmo que soy miembro IEEE
                    </span>
                  </label>

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
                    <h2 className="text-xl font-semibold text-slate-950">Artículos registrados</h2>
                    <p className="mt-2 text-sm leading-7 text-slate-500">
                      Agrega nuevos artículos o elimina los actuales antes de guardar los cambios.
                    </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        appendPaper({
                          existingPaperId: null,
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
                      title="No tienes artículos registrados"
                      description="Tu inscripción actual no tiene artículos asociados. Puedes agregar uno ahora."
                      variant="info"
                    />
                  ) : (
                    <div className="space-y-4">
                      {paperFields.map((paper, index) => (
                        <Card key={paper.id} className="border border-slate-100 bg-slate-50 p-5">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Artículo {index + 1}
                              </p>
                              {paper.existingPaperId ? (
                                <p className="mt-1 text-sm text-slate-500">
                                  Este artículo ya está asociado a tu inscripción.
                                </p>
                              ) : (
                                <p className="mt-1 text-sm text-slate-500">
                                  Completa la información para registrar un nuevo artículo.
                                </p>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              className="border border-slate-200"
                              onClick={() => removePaperField(index)}
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
                                required: 'El titulo es obligatorio',
                              })}
                            />
                            <InputField
                              label="Código del artículo"
                              error={errors.papers?.[index]?.paperCode?.message}
                              {...register(`papers.${index}.paperCode`, {
                                required: 'El codigo es obligatorio',
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
                            <InputField
                              type="hidden"
                              {...register(`papers.${index}.existingPaperId`)}
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
                  )}
                </div>
              ) : null}

              {currentStep === 3 ? (
                <div className="space-y-6">
                  <Alert
                    title="Resumen de cambios"
                    description="Verifica tu información antes de guardar la actualización. Este resumen de pago se recalculó con los cambios actuales del formulario."
                    variant="info"
                  />
                  <div className="grid gap-4">
                    {summaryRows.map((row) => (
                      <SummaryRow key={row.label} label={row.label} value={row.value} />
                    ))}
                    <SummaryRow
                      label="Saldo pendiente"
                      value={formatCurrency(paymentPreview?.pendingAmount || 0)}
                    />
                    <SummaryRow
                      label="Estado de pago"
                      value={translatePaymentStatus(paymentPreview?.paymentStatus)}
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
                    if (currentStep === 0) {
                      navigate('/registration-details');
                      return;
                    }

                    const currentSequenceIndex = stepSequence.indexOf(currentStep);
                    const previousStep = stepSequence[Math.max(currentSequenceIndex - 1, 0)];
                    setCurrentStep(previousStep);
                  }}
                >
                  {currentStep === 0 ? 'Volver' : 'Atrás'}
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
                    disabled={isSubmitting || isPreviewLoading}
                    onClick={submitEdition}
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-24 overflow-hidden border-none bg-[#00334d] p-8 text-white shadow-[0_30px_80px_rgba(0,51,77,0.2)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,74,74,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(57,141,222,0.18),transparent_30%)]" />
            <div className="relative">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a6dce5]">
                Edición guiada
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                Actualiza tu información con tranquilidad
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/78">
                Esta pantalla conserva la misma estructura de tu registro para que puedas ubicar
                rápido cada dato y mantener tu inscripción al día.
              </p>
              <div className="mt-6 space-y-4">
                {guidanceItems.map((item, index) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-white/6 px-5 py-4 backdrop-blur-sm"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ffb184]">
                      Paso recomendado {index + 1}
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">{item.title}</p>
                    <p className="mt-2 text-sm leading-7 text-white/72">{item.description}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border border-dashed border-[#ff944d]/55 bg-[#002c45]/70 px-5 py-4">
                <p className="text-sm font-semibold text-white">
                  Artículos actualmente asociados: {paperFields.length || 0}
                </p>
                <p className="mt-1 text-sm text-white/72">
                  Podrás revisar esta información antes de guardar los cambios de tu inscripción.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={isSuccessModalOpen}
        title="Usuario editado exitosamente"
        onClose={() => {
          setIsSuccessModalOpen(false);
          navigate('/dashboard');
        }}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            La información fue actualizada correctamente.
          </p>
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              variant="ghost"
              className="border border-slate-200"
              onClick={() => {
                setIsSuccessModalOpen(false);
                navigate('/payments');
              }}
            >
              Ir a pagar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsSuccessModalOpen(false);
                navigate('/dashboard');
              }}
            >
              Ir al panel
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
    papers: (shouldIncludePapers ? data.papers || [] : []).map((paper) => ({
      pages: paper.pages ? Number(paper.pages) : 0,
    })),
  };
}

function didPaperChange(originalPaper, draftPaper) {
  if (!originalPaper) {
    return true;
  }

  const originalAuthors = Array.isArray(originalPaper.authors)
    ? originalPaper.authors.join(', ')
    : originalPaper.authors || '';
  const normalizedOriginalAuthors = normalizeAuthorsText(originalAuthors);
  const normalizedDraftAuthors = normalizeAuthorsText(draftPaper.authorsText || '');

  return (
    (originalPaper.title || '') !== (draftPaper.title || '') ||
    (originalPaper.paperCode || '') !== (draftPaper.paperCode || '') ||
    String(originalPaper.pages || '') !== String(draftPaper.pages || '') ||
    normalizedOriginalAuthors !== normalizedDraftAuthors
  );
}

function normalizeAuthorsText(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .join(', ');
}

function resolveMemberType({ occupation, isIeeeMember }) {
  if (occupation === 'student') {
    return 'student';
  }

  return isIeeeMember ? 'ieee_member' : 'non_ieee_member';
}

function deriveRegistrationCategory(registration) {
  if (registration?.memberType === 'student') {
    return 'student';
  }

  return 'professional';
}

function buildFormValues(user, registration, registrationFields) {
  const customFieldValues = mapCustomFieldValues(registration?.customFieldValues);

  return {
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    countryId: user?.countryId ? String(user.countryId) : '',
    city: user?.city || '',
    address: user?.address || '',
    birthDate: user?.birthDate || '',
    gender: normalizeGenderValue(user?.gender),
    docType: normalizeDocumentTypeValue(user?.docType),
    docNumber: user?.docNumber || '',
    affiliation: user?.affiliation || '',
    occupation: normalizeOccupationValue(user?.occupation),
    eventEditionId: registration?.eventEditionId ? String(registration.eventEditionId) : '',
    participationType: registration?.participationType || 'attendee',
    attendanceType: registration?.attendanceType || 'in_person',
    registrationCategory: deriveRegistrationCategory(registration),
    isIeeeMember: Boolean(registration?.isIeeeMember || registration?.memberType === 'ieee_member'),
    membershipNumber: registration?.membershipNumber || '',
    customFields: {
      registration: registrationFields.reduce((accumulator, field) => {
        accumulator[field.id] = customFieldValues[field.id] || '';
        return accumulator;
      }, {}),
    },
    papers: (registration?.papers || []).map((paper) => ({
      existingPaperId: paper.id || null,
      title: paper.title || '',
      paperCode: paper.paperCode || '',
      authorsText: Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors || '',
      pages: paper.pages || '',
    })),
  };
}

function mapCustomFieldValues(values = []) {
  return values.reduce((accumulator, item) => {
    accumulator[item.customFieldId] = item.value;
    return accumulator;
  }, {});
}

function normalizeGenderValue(value) {
  if (!value) {
    return '';
  }

  return String(value).toLowerCase();
}

function normalizeDocumentTypeValue(value) {
  if (!value) {
    return '';
  }

  return String(value).toUpperCase();
}

function normalizeOccupationValue(value) {
  if (!value) {
    return '';
  }

  const normalized = String(value).toLowerCase();
  if (normalized === 'professional' || normalized === 'student') {
    return normalized;
  }

  return value;
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
  return error?.response?.data?.message || error?.message || fallbackMessage;
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

  setFormError(apiMessage || error.message || fallbackMessage);
}

function mapBackendFieldToFormField(field) {
  const fieldMap = {
    firstName: 'firstName',
    lastName: 'lastName',
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

export default EditRegistrationPage;
