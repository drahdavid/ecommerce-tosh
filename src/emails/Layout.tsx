import { Body, Column, Container, Head, Heading, Hr, Html, Img, Link, Preview, Row as EmailRow, Section, Text } from 'react-email'
import type { ReactNode } from 'react'
import { LOGO, logoWidth } from '@/lib/brand'

export const colors = { text: '#18181b', muted: '#71717a', border: '#e4e4e7', accent: '#18181b' }

export const EmailLayout = (props: { preview: string; title: string; storeName: string; siteUrl: string; children: ReactNode }) => (
  <Html lang="es">
    <Head />
    <Preview>{props.preview}</Preview>
    <Body style={{ backgroundColor: '#f4f4f5', fontFamily: 'Helvetica, Arial, sans-serif', color: colors.text }}>
      <Container style={{ backgroundColor: '#ffffff', margin: '24px auto', padding: '32px', maxWidth: '560px', borderRadius: '8px' }}>
        <EmailRow>
          <Column style={{ width: `${logoWidth(36) + 10}px` }}>
            <Img src={`${props.siteUrl}${LOGO.src}`} width={logoWidth(36)} height={36} alt="" />
          </Column>
          <Column>
            <Text style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{props.storeName}</Text>
          </Column>
        </EmailRow>
        <Heading as="h1" style={{ fontSize: '22px', margin: '24px 0 8px' }}>
          {props.title}
        </Heading>
        {props.children}
        <Hr style={{ borderColor: colors.border, margin: '32px 0 16px' }} />
        <Text style={{ fontSize: '12px', color: colors.muted }}>
          <Link href={props.siteUrl} style={{ color: colors.muted }}>
            {props.siteUrl.replace(/^https?:\/\//, '')}
          </Link>
          {' · '}
          <Link href={`${props.siteUrl}/arrepentimiento`} style={{ color: colors.muted }}>
            Botón de arrepentimiento
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <Section>
    <Text style={{ margin: '4px 0', fontSize: '14px', fontWeight: strong ? 700 : 400 }}>
      <span style={{ color: strong ? colors.text : colors.muted }}>{label}</span>
      <span style={{ float: 'right' }}>{value}</span>
    </Text>
  </Section>
)
