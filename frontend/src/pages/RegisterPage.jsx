import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { InputField } from '../components/InputField';
import { Modal } from '../components/Modal';
import { SelectField } from '../components/SelectField';
import { Stepper } from '../components/Stepper';
import { TextAreaField } from '../components/TextAreaField';
import { participantTypes, registrationSteps } from '../constants/participantTypes';
import { useSession } from '../hooks/useSession';
import { registrationService } from '../services/registrationService';
import { formatCurrency } from '../utils/currency';
import { calculatePricing } from '../utils/pricing';

const defaultValues = {
  firstName: '',
  lastName: '',
  email: '',
  institution: '',
  country: '',
  participantType: 'attendee',
  isIeeeMember: false,
  memberId: '',
  paperTitle: '',
  paperAbstract: '',
  paperCount: 0,
  partialPayment: 0,
};

function RegisterPage() {
  const navigate = useNavigate();
  const { addRegistration, setUserProfile } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [formError, setFormError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
  });

  const values = watch();
  const paperCount = Number(values.paperCount || 0);

  const papers = useMemo(
    () =>
      Array.from({ length: paperCount }, (_, index) => ({
        title: values[`paperTitle_${index}`] || '',
        abstract: values[`paperAbstract_${index}`] || '',
      })).filter((paper) => paper.title),
    [paperCount, values],
  );

  const pricing = calculatePricing({
    participantType: values.participantType,
    isIeeeMember: values.isIeeeMember,
    partialPayment: values.partialPayment,
    papers,
  });

  const validateStep = async () => {
    const fieldsByStep = [
      ['firstName', 'lastName', 'email', 'institution', 'country'],
      ['participantType', 'memberId'],
      Array.from({ length: paperCount }, (_, index) => [`paperTitle_${index}`, `paperAbstract_${index}`]).flat(),
      [],
    ];

    const valid = await trigger(fieldsByStep[currentStep]);
    if (valid) {
      setCurrentStep((prev) => Math.min(prev + 1, registrationSteps.length - 1));
    }
  };

  const onSubmit = async (data) => {
    try {
      setFormError('');

      const payload = {
        personalInfo: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          institution: data.institution,
          country: data.country,
        },
        participantType: data.participantType,
        isIeeeMember: data.isIeeeMember,
        memberId: data.isIeeeMember ? data.memberId : '',
        papers,
        partialPayment: Number(data.partialPayment || 0),
      };

      const response = await registrationService.submitRegistration(payload);
      addRegistration(response);
      setUserProfile({
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        organization: data.institution,
        country: data.country,
      });
      setSubmissionResult(response);
      setShowSuccessModal(true);
    } catch (error) {
      setFormError('The registration could not be completed. Please try again.');
    }
  };

  const participantOptions = participantTypes.map((item) => ({
    value: item.id,
    label: `${item.title} (${formatCurrency(item.price)})`,
  }));

  return (
    <section className="container-shell py-16">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              Registration Flow
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-slate-950">
              Complete your conference registration
            </h1>
          </div>

          <Stepper steps={registrationSteps} currentStep={currentStep} />

          <Card className="p-8">
            <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
              {formError ? (
                <Alert title="Registration error" description={formError} variant="danger" />
              ) : null}

              {currentStep === 0 ? (
                <div className="grid gap-5 md:grid-cols-2">
                  <InputField
                    label="First Name"
                    placeholder="Camila"
                    error={errors.firstName?.message}
                    {...register('firstName', { required: 'First name is required' })}
                  />
                  <InputField
                    label="Last Name"
                    placeholder="Torres"
                    error={errors.lastName?.message}
                    {...register('lastName', { required: 'Last name is required' })}
                  />
                  <InputField
                    label="Email"
                    type="email"
                    placeholder="name@institution.org"
                    error={errors.email?.message}
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^\S+@\S+\.\S+$/,
                        message: 'Enter a valid email',
                      },
                    })}
                  />
                  <InputField
                    label="Institution"
                    placeholder="University or company"
                    error={errors.institution?.message}
                    {...register('institution', { required: 'Institution is required' })}
                  />
                  <InputField
                    label="Country"
                    placeholder="Colombia"
                    error={errors.country?.message}
                    className="md:col-span-2"
                    {...register('country', { required: 'Country is required' })}
                  />
                </div>
              ) : null}

              {currentStep === 1 ? (
                <div className="space-y-5">
                  <SelectField
                    label="Participant Type"
                    options={participantOptions}
                    error={errors.participantType?.message}
                    {...register('participantType', {
                      required: 'Participant type is required',
                    })}
                  />

                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                    <input type="checkbox" className="mt-1 h-4 w-4" {...register('isIeeeMember')} />
                    <span>
                      <span className="block text-sm font-semibold text-slate-800">
                        Apply IEEE member discount
                      </span>
                      <span className="block text-sm text-slate-500">
                        A 15% discount is applied to the registration subtotal.
                      </span>
                    </span>
                  </label>

                  {values.isIeeeMember ? (
                    <InputField
                      label="IEEE Member ID"
                      placeholder="MEM-123456"
                      error={errors.memberId?.message}
                      {...register('memberId', {
                        validate: (value) =>
                          values.isIeeeMember && !value
                            ? 'Member ID is required when discount is selected'
                            : true,
                      })}
                    />
                  ) : null}
                </div>
              ) : null}

              {currentStep === 2 ? (
                <div className="space-y-6">
                  <SelectField
                    label="Number of papers/articles"
                    options={[
                      { value: 0, label: '0' },
                      { value: 1, label: '1' },
                      { value: 2, label: '2' },
                      { value: 3, label: '3' },
                    ]}
                    {...register('paperCount')}
                  />

                  {Array.from({ length: paperCount }, (_, index) => (
                    <Card key={index} className="border border-slate-100 bg-slate-50 p-5">
                      <div className="grid gap-5">
                        <InputField
                          label={`Paper ${index + 1} Title`}
                          placeholder="Enter paper title"
                          error={errors[`paperTitle_${index}`]?.message}
                          {...register(`paperTitle_${index}`, {
                            required: 'Paper title is required',
                          })}
                        />
                        <TextAreaField
                          label={`Paper ${index + 1} Abstract`}
                          placeholder="Provide a short abstract"
                          error={errors[`paperAbstract_${index}`]?.message}
                          {...register(`paperAbstract_${index}`, {
                            required: 'Paper abstract is required',
                            minLength: {
                              value: 50,
                              message: 'Abstract must contain at least 50 characters',
                            },
                          })}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : null}

              {currentStep === 3 ? (
                <div className="space-y-6">
                  <Alert
                    title="Mock payment configuration"
                    description="Use a partial payment amount to simulate pending balances on the dashboard."
                    variant="info"
                  />
                  <InputField
                    label="Partial payment amount"
                    type="number"
                    min="0"
                    step="1"
                    error={errors.partialPayment?.message}
                    helperText={`Remaining balance after payment: ${formatCurrency(pricing.balance)}`}
                    {...register('partialPayment', {
                      min: {
                        value: 0,
                        message: 'Payment must be zero or greater',
                      },
                    })}
                  />
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
                  Back
                </Button>
                <div className="flex gap-3">
                  {currentStep < registrationSteps.length - 1 ? (
                    <Button type="button" variant="primary" onClick={validateStep}>
                      Continue
                    </Button>
                  ) : (
                    <Button type="submit" variant="accent" disabled={isSubmitting}>
                      {isSubmitting ? 'Submitting...' : 'Submit Registration'}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-24 p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              Pricing Summary
            </p>
            <div className="mt-6 space-y-4">
              <SummaryRow label="Participant" value={pricing.participant.title} />
              <SummaryRow label="Base Fee" value={formatCurrency(pricing.baseFee)} />
              <SummaryRow label="Extra Papers" value={`${pricing.extraPapers}`} />
              <SummaryRow label="Extra Paper Fees" value={formatCurrency(pricing.extraPaperFee)} />
              <SummaryRow label="Member Discount" value={`-${formatCurrency(pricing.memberDiscount)}`} />
              <SummaryRow label="Paid Now" value={formatCurrency(pricing.paidAmount)} />
              <div className="border-t border-dashed border-slate-200 pt-4">
                <SummaryRow label="Total" value={formatCurrency(pricing.total)} emphasized />
                <SummaryRow
                  label="Pending Balance"
                  value={formatCurrency(pricing.balance)}
                  emphasized
                />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={showSuccessModal}
        title="Registration submitted"
        onClose={() => setShowSuccessModal(false)}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Your mock registration has been created successfully.
          </p>
          {submissionResult ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <p>
                <span className="font-semibold">Registration ID:</span> {submissionResult.id}
              </p>
              <p>
                <span className="font-semibold">Payment status:</span>{' '}
                {submissionResult.paymentStatus}
              </p>
            </div>
          ) : null}
          <div className="flex gap-3">
            <Button variant="primary" onClick={() => navigate('/login')}>
              Continue to Login
            </Button>
            <Button
              variant="ghost"
              className="border border-slate-200"
              onClick={() => setShowSuccessModal(false)}
            >
              Stay Here
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

function SummaryRow({ label, value, emphasized = false }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm ${emphasized ? 'font-semibold text-slate-950' : 'text-slate-800'}`}>
        {value}
      </span>
    </div>
  );
}

export default RegisterPage;
