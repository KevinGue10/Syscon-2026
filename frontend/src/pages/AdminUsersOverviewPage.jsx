import { useEffect, useMemo, useState } from 'react';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { InputField } from '../components/InputField';
import { Modal } from '../components/Modal';
import { SelectField } from '../components/SelectField';
import { Table } from '../components/Table';
import { dashboardService } from '../services/dashboardService';
import {
  translateAttendanceType,
  translateDocumentType,
  translateGender,
  translateOccupation,
} from '../utils/translations';

const PAGE_SIZE = 10;

function AdminUsersOverviewPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    totalItems: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    country: '',
    city: '',
    occupation: '',
    attendanceType: '',
    isIeeeMember: '',
    isTems: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    country: '',
    city: '',
    occupation: '',
    attendanceType: '',
    isIeeeMember: '',
    isTems: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    title: '',
    user: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadUsers() {
      try {
        setIsLoading(true);
        setError('');
        const response = await dashboardService.getAdminUsers({
          page: currentPage,
          pageSize: PAGE_SIZE,
          filters: appliedFilters,
        });

        if (!isMounted) {
          return;
        }

        setUsers(response.users || []);
        setPagination(
          response.pagination || {
            page: currentPage,
            pageSize: PAGE_SIZE,
            totalItems: response.users?.length || 0,
            totalPages: 1,
          },
        );
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(
          loadError?.response?.data?.message ||
            loadError?.message ||
            'No fue posible cargar el consolidado de usuarios.',
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, [appliedFilters, currentPage]);

  const countryOptions = useMemo(
    () => buildDistinctOptions(users.map((user) => resolveCountryName(user))),
    [users],
  );

  const cityOptions = useMemo(
    () => buildDistinctOptions(users.map((user) => user.city || '')),
    [users],
  );

  const occupationOptions = useMemo(
    () => buildDistinctOptions(users.map((user) => translateOccupation(user.occupation))),
    [users],
  );

  const attendanceOptions = useMemo(
    () => buildDistinctOptions(users.map((user) => translateAttendanceType(resolvePrimaryRegistration(user)?.attendanceType))),
    [users],
  );

  const booleanOptions = [
    { value: 'true', label: 'Si' },
    { value: 'false', label: 'No' },
  ];

  if (isLoading) {
    return (
      <section className="container-shell py-16">
        <Alert
          title="Cargando consolidado de usuarios"
          description="Consultando los datos completos de participantes desde el backend."
          variant="info"
        />
      </section>
    );
  }

  if (error) {
    return (
      <section className="container-shell py-16">
        <Alert title="No fue posible cargar la vista" description={error} variant="danger" />
      </section>
    );
  }

  return (
    <section className="container-shell py-16">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
          Vista administrativa
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-950">
          Detalle completo de participantes
        </h1>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">
          Consulta los datos personales y de inscripcion en una sola tabla, con filtros de apoyo
          para seguimiento administrativo y operativo.
        </p>
      </div>

      <Card className="p-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InputField
            label="Buscar"
            placeholder="Nombre, correo, afiliacion o documento"
            value={filters.search}
            onChange={(event) => updateFilter(setFilters, 'search', event.target.value)}
          />
          <SelectField
            label="Pais"
            options={countryOptions}
            value={filters.country}
            onChange={(event) => updateFilter(setFilters, 'country', event.target.value)}
          />
          <SelectField
            label="Ciudad"
            options={cityOptions}
            value={filters.city}
            onChange={(event) => updateFilter(setFilters, 'city', event.target.value)}
          />
          <SelectField
            label="Ocupacion"
            options={occupationOptions}
            value={filters.occupation}
            onChange={(event) => updateFilter(setFilters, 'occupation', event.target.value)}
          />
          <SelectField
            label="Tipo de asistencia"
            options={attendanceOptions}
            value={filters.attendanceType}
            onChange={(event) => updateFilter(setFilters, 'attendanceType', event.target.value)}
          />
          <SelectField
            label="Miembro IEEE"
            options={booleanOptions}
            value={filters.isIeeeMember}
            onChange={(event) => updateFilter(setFilters, 'isIeeeMember', event.target.value)}
          />
          <SelectField
            label="Miembro TEMS"
            options={booleanOptions}
            value={filters.isTems}
            onChange={(event) => updateFilter(setFilters, 'isTems', event.target.value)}
          />
          <div className="flex items-end gap-3">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => {
                setCurrentPage(1);
                setAppliedFilters(filters);
              }}
            >
              Aplicar filtros
            </Button>
            <Button
              variant="ghost"
              className="w-full border border-slate-200"
              onClick={() => {
                const clearedFilters = {
                  search: '',
                  country: '',
                  city: '',
                  occupation: '',
                  attendanceType: '',
                  isIeeeMember: '',
                  isTems: '',
                };
                setFilters(clearedFilters);
                setAppliedFilters(clearedFilters);
                setCurrentPage(1);
              }}
            >
              Limpiar
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <Table
            allowOverflow
            columns={[
              { key: 'id', label: 'ID' },
              {
                key: 'fullName',
                label: 'Nombre completo',
                render: (_, row) => (
                  <div className="min-w-[12rem]">
                    {`${row.firstName || ''} ${row.lastName || ''}`.trim() || 'No registrado'}
                  </div>
                ),
              },
              { key: 'email', label: 'Correo' },
              {
                key: 'country',
                label: 'Pais',
                render: (_, row) => resolveCountryName(row) || 'No registrado',
              },
              { key: 'city', label: 'Ciudad' },
              { key: 'affiliation', label: 'Afiliacion' },
              {
                key: 'occupation',
                label: 'Ocupacion',
                render: (value) => translateOccupation(value),
              },
              {
                key: 'gender',
                label: 'Genero',
                render: (value) => translateGender(value),
              },
              {
                key: 'docType',
                label: 'Documento',
                render: (value, row) => (
                  <div className="min-w-[12rem]">
                    {`${translateDocumentType(value)}${row.docNumber ? ` - ${row.docNumber}` : ''}`}
                  </div>
                ),
              },
              { key: 'phoneNumber', label: 'Telefono' },
              {
                key: 'isIeeeMember',
                label: 'Miembro IEEE',
                render: (_, row) => (resolvePrimaryRegistration(row)?.isIeeeMember ? 'Si' : 'No'),
              },
              {
                key: 'isTems',
                label: 'Miembro TEMS',
                render: (_, row) => (resolvePrimaryRegistration(row)?.isTems ? 'Si' : 'No'),
              },
              {
                key: 'membershipNumber',
                label: 'Membresia',
                render: (_, row) => resolvePrimaryRegistration(row)?.membershipNumber || 'No aplica',
              },
              {
                key: 'attendanceType',
                label: 'Asistencia',
                render: (_, row) =>
                  translateAttendanceType(resolvePrimaryRegistration(row)?.attendanceType),
              },
              {
                key: 'actions',
                label: 'Acciones',
                render: (_, row) => (
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-semibold text-slate-700 transition hover:bg-slate-100"
                    onClick={() => setSelectedUser(row)}
                  >
                    ...
                  </button>
                ),
              },
            ]}
            rows={users}
            emptyMessage="No hay participantes que coincidan con los filtros aplicados."
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            Mostrando pagina {pagination.page} de {pagination.totalPages}. Total de registros:{' '}
            {pagination.totalItems}
          </p>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="border border-slate-200"
              disabled={pagination.page <= 1}
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
            >
              Anterior
            </Button>
            <Button
              variant="ghost"
              className="border border-slate-200"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setCurrentPage((page) => Math.min(page + 1, pagination.totalPages))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        isOpen={Boolean(selectedUser)}
        title="Acciones disponibles"
        onClose={() => setSelectedUser(null)}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Selecciona una accion para{' '}
            <span className="font-semibold text-slate-950">
              {selectedUser
                ? `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()
                : 'el participante'}
            </span>
            .
          </p>
          <div className="grid gap-2">
            {['Validar pago', 'Ver articulos', 'Inhabilitar usuario'].map((action) => (
              <button
                key={action}
                type="button"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                onClick={() => {
                  setSelectedUser(null);
                  setActionModal({
                    isOpen: true,
                    title: action,
                    user: selectedUser,
                  });
                }}
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={actionModal.isOpen}
        title={actionModal.title}
        onClose={() =>
          setActionModal({
            isOpen: false,
            title: '',
            user: null,
          })
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Accion seleccionada para{' '}
            <span className="font-semibold text-slate-950">
              {actionModal.user
                ? `${actionModal.user.firstName || ''} ${actionModal.user.lastName || ''}`.trim()
                : 'el participante'}
            </span>
            .
          </p>
          <p className="text-sm text-slate-500">
            Cuando me detalles el flujo de esta opcion, conecto aqui el contenido y las acciones del
            modal.
          </p>
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={() =>
                setActionModal({
                  isOpen: false,
                  title: '',
                  user: null,
                })
              }
            >
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

function updateFilter(setFilters, key, value) {
  setFilters((current) => ({
    ...current,
    [key]: value,
  }));
}

function buildDistinctOptions(values) {
  return [...new Set(values.filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({
      value,
      label: value,
    }));
}

function resolveCountryName(user) {
  if (user?.country?.name) {
    return user.country.name;
  }

  if (typeof user?.country === 'string' && user.country.trim()) {
    return user.country;
  }

  return '';
}

function resolvePrimaryRegistration(user) {
  return user?.registrations?.[0] || null;
}

export default AdminUsersOverviewPage;
