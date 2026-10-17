import type { GlobalConfig } from 'payload'
import { admins, staff } from '@/access'

export const ShippingSettings: GlobalConfig = {
  slug: 'shipping-settings',
  label: 'Configuración de envíos',
  admin: { group: 'Envíos' },
  access: { read: staff, update: admins },
  fields: [
    {
      name: 'origin',
      type: 'group',
      label: 'Dirección de origen (despacho)',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'street', type: 'text', label: 'Calle' },
            { name: 'number', type: 'text', label: 'Número' },
            { name: 'city', type: 'text', label: 'Localidad' },
            { name: 'province', type: 'text', label: 'Provincia' },
            { name: 'postalCode', type: 'text', label: 'CP' },
          ],
        },
      ],
    },
    {
      name: 'pickup',
      type: 'group',
      label: 'Retiro en local',
      fields: [
        { name: 'enabled', type: 'checkbox', label: 'Habilitado', defaultValue: true },
        {
          type: 'row',
          fields: [
            { name: 'address', type: 'text', label: 'Dirección de retiro' },
            { name: 'hours', type: 'text', label: 'Horarios' },
          ],
        },
      ],
    },
    {
      name: 'rateTable',
      type: 'group',
      label: 'Envío a domicilio (tarifas propias)',
      admin: { description: 'Usa las tarifas cargadas en "Zonas de envío".' },
      fields: [{ name: 'enabled', type: 'checkbox', label: 'Habilitado', defaultValue: true }],
    },
    {
      name: 'zipnova',
      type: 'group',
      label: 'Zipnova (Andreani, Correo Argentino, OCA y otros sin contrato propio)',
      admin: { description: 'Requiere ZIPNOVA_API_KEY / ZIPNOVA_API_SECRET en las variables de entorno.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'enabled', type: 'checkbox', label: 'Habilitado', defaultValue: false },
            { name: 'accountId', type: 'text', label: 'Account ID' },
            { name: 'originId', type: 'text', label: 'ID de origen' },
          ],
        },
        {
          name: 'markupPercent',
          type: 'number',
          label: 'Recargo sobre la tarifa (%)',
          defaultValue: 0,
          min: 0,
        },
      ],
    },
    {
      name: 'correoArgentino',
      type: 'group',
      label: 'Correo Argentino (MiCorreo, contrato propio)',
      admin: { description: 'Próximamente. Requiere credenciales MiCorreo (CORREOAR_*).' },
      fields: [{ name: 'enabled', type: 'checkbox', label: 'Habilitado', defaultValue: false }],
    },
    {
      name: 'andreani',
      type: 'group',
      label: 'Andreani (contrato propio)',
      admin: { description: 'Próximamente. Requiere credenciales REST de Andreani (ANDREANI_*).' },
      fields: [{ name: 'enabled', type: 'checkbox', label: 'Habilitado', defaultValue: false }],
    },
  ],
}
