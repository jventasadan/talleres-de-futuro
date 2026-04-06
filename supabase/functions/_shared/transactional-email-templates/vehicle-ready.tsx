import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "talleres-de-futuro"

interface VehicleReadyProps {
  clientName?: string
  licensePlate?: string
  brand?: string
  model?: string
  workshopName?: string
  workshopPhone?: string
  workshopEmail?: string
  workshopAddress?: string
}

const VehicleReadyEmail = ({
  clientName,
  licensePlate,
  brand,
  model,
  workshopName,
  workshopPhone,
  workshopEmail,
  workshopAddress,
}: VehicleReadyProps) => {
  const vehicle = [brand, model].filter(Boolean).join(' ')
  const vehicleInfo = vehicle ? `${vehicle} (${licensePlate})` : licensePlate || 'su vehículo'

  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>Su vehículo {vehicleInfo} está listo para recoger</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Heading style={h1}>{workshopName || SITE_NAME}</Heading>
          </Section>

          <Section style={contentSection}>
            <Heading style={h2}>
              {clientName ? `Hola ${clientName},` : '¡Hola!'}
            </Heading>

            <Text style={text}>
              Nos complace informarle de que su vehículo <strong>{vehicleInfo}</strong> ya está listo y puede pasar a recogerlo cuando le resulte conveniente.
            </Text>

            <Text style={text}>
              Le agradecemos su confianza y esperamos que quede satisfecho con el servicio realizado. Si tiene cualquier duda o consulta, no dude en contactarnos.
            </Text>

            <Text style={text}>
              <strong>¡Le esperamos!</strong>
            </Text>
          </Section>

          <Hr style={divider} />

          <Section style={footerSection}>
            <Text style={footerTitle}>{workshopName || SITE_NAME}</Text>
            {workshopPhone && <Text style={footerText}>📞 {workshopPhone}</Text>}
            {workshopEmail && <Text style={footerText}>✉️ {workshopEmail}</Text>}
            {workshopAddress && <Text style={footerText}>📍 {workshopAddress}</Text>}
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: VehicleReadyEmail,
  subject: (data: Record<string, any>) =>
    `Su vehículo ${data.licensePlate || ''} está listo - ${data.workshopName || SITE_NAME}`,
  displayName: 'Vehículo listo para recoger',
  previewData: {
    clientName: 'Juan García',
    licensePlate: '1234ABC',
    brand: 'Seat',
    model: 'León',
    workshopName: 'Talleres del Futuro',
    workshopPhone: '600 123 456',
    workshopEmail: 'info@talleres.com',
    workshopAddress: 'Calle Principal 10, Madrid',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { maxWidth: '580px', margin: '0 auto', padding: '0' }
const headerSection = {
  backgroundColor: '#E8850A',
  padding: '24px 30px',
  borderRadius: '8px 8px 0 0',
}
const h1 = {
  fontSize: '22px',
  fontWeight: '700' as const,
  color: '#ffffff',
  margin: '0',
  textAlign: 'center' as const,
}
const contentSection = { padding: '30px' }
const h2 = {
  fontSize: '20px',
  fontWeight: '600' as const,
  color: '#1a1a2e',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#333333',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const divider = { borderColor: '#e5e5e5', margin: '0' }
const footerSection = { padding: '20px 30px', backgroundColor: '#f8f8f8', borderRadius: '0 0 8px 8px' }
const footerTitle = {
  fontSize: '14px',
  fontWeight: '700' as const,
  color: '#1a1a2e',
  margin: '0 0 6px',
}
const footerText = {
  fontSize: '13px',
  color: '#666666',
  margin: '0 0 4px',
  lineHeight: '1.4',
}
