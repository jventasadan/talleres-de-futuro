import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "talleres-de-futuro"

interface VehicleReadyProps {
  clientName?: string
  licensePlate?: string
  service?: string
  workshopName?: string
  workshopPhone?: string
  workshopEmail?: string
  workshopAddress?: string
  workshopCif?: string
}

const VehicleReadyEmail = ({
  clientName,
  licensePlate,
  service,
  workshopName,
  workshopPhone,
  workshopEmail,
  workshopAddress,
  workshopCif,
}: VehicleReadyProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>
      {clientName
        ? `${clientName}, su vehículo está listo para recoger`
        : 'Su vehículo está listo para recoger'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={headerSection}>
          <Heading style={logo}>
            {workshopName || SITE_NAME}
          </Heading>
        </Section>

        {/* Body */}
        <Section style={bodySection}>
          <Heading style={h1}>
            {clientName ? `Hola ${clientName},` : 'Estimado/a cliente,'}
          </Heading>

          <Text style={text}>
            Nos complace informarle de que su vehículo
            {licensePlate ? ` con matrícula <strong>${licensePlate}</strong>` : ''} ya está
            listo para ser recogido.
          </Text>

          {service && (
            <Text style={text}>
              <strong>Servicio realizado:</strong> {service}
            </Text>
          )}

          <Text style={text}>
            Puede pasar a recogerlo en nuestro horario de atención. Si tiene alguna
            duda, no dude en ponerse en contacto con nosotros.
          </Text>

          <Text style={textHighlight}>
            ¡Le esperamos! 🚗
          </Text>
        </Section>

        <Hr style={divider} />

        {/* Footer — workshop details */}
        <Section style={footerSection}>
          {workshopName && <Text style={footerBold}>{workshopName}</Text>}
          {workshopCif && <Text style={footerText}>CIF: {workshopCif}</Text>}
          {workshopAddress && <Text style={footerText}>{workshopAddress}</Text>}
          {workshopPhone && <Text style={footerText}>Tel: {workshopPhone}</Text>}
          {workshopEmail && <Text style={footerText}>{workshopEmail}</Text>}
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: VehicleReadyEmail,
  subject: (data: Record<string, any>) =>
    data.clientName
      ? `${data.clientName}, su vehículo está listo`
      : 'Su vehículo está listo para recoger',
  displayName: 'Vehículo listo',
  previewData: {
    clientName: 'Juan García',
    licensePlate: '1234 ABC',
    service: 'Cambio de aceite y filtros',
    workshopName: 'Taller Ejemplo',
    workshopPhone: '612 345 678',
    workshopEmail: 'info@taller.com',
    workshopAddress: 'Calle Mayor 10, Madrid',
    workshopCif: 'B12345678',
  },
} satisfies TemplateEntry

// Styles
const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { maxWidth: '580px', margin: '0 auto', padding: '0' }
const headerSection = {
  backgroundColor: '#1a1d2e',
  padding: '28px 32px',
  borderRadius: '10px 10px 0 0',
}
const logo = {
  color: '#e88c30',
  fontSize: '22px',
  fontWeight: '700' as const,
  margin: '0',
  textAlign: 'center' as const,
}
const bodySection = { padding: '32px 32px 16px' }
const h1 = { fontSize: '20px', fontWeight: '700' as const, color: '#1a1d2e', margin: '0 0 18px' }
const text = { fontSize: '15px', color: '#3a3d4a', lineHeight: '1.6', margin: '0 0 16px' }
const textHighlight = {
  fontSize: '16px',
  color: '#e88c30',
  fontWeight: '600' as const,
  margin: '8px 0 0',
}
const divider = { borderColor: '#e5e7eb', margin: '0' }
const footerSection = { padding: '20px 32px 28px' }
const footerBold = { fontSize: '13px', fontWeight: '700' as const, color: '#1a1d2e', margin: '0 0 4px' }
const footerText = { fontSize: '12px', color: '#6b7280', margin: '0 0 2px', lineHeight: '1.5' }
