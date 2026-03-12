import { NextResponse } from 'next/server';

const normalizeEnvValue = (value: string | undefined): string => {
  if (!value) {
    return '';
  }
  const withoutCarriageReturn = value.replace(/\r/g, '').trim();
  const isWrappedByDoubleQuotes =
    withoutCarriageReturn.startsWith('"') && withoutCarriageReturn.endsWith('"');
  const isWrappedBySingleQuotes =
    withoutCarriageReturn.startsWith("'") && withoutCarriageReturn.endsWith("'");

  if (isWrappedByDoubleQuotes || isWrappedBySingleQuotes) {
    return withoutCarriageReturn.slice(1, -1).trim();
  }
  return withoutCarriageReturn;
};

export async function GET() {
  const adminUsername = normalizeEnvValue(process.env.ADMIN_USERNAME);
  const adminPassword = normalizeEnvValue(process.env.ADMIN_PASSWORD);
  const adminEmail = normalizeEnvValue(process.env.ADMIN_EMAIL);
  const authSecret = normalizeEnvValue(process.env.AUTH_SECRET);
  const nextAuthUrl = normalizeEnvValue(process.env.NEXTAUTH_URL);

  const hasAdminUsername = adminUsername.length > 0;
  const hasAdminPassword = adminPassword.length > 0;
  const hasAdminEmail = adminEmail.length > 0;
  const hasAuthSecret = authSecret.length > 0;
  const hasNextAuthUrl = nextAuthUrl.length > 0;
  const configured =
    hasAdminUsername && hasAdminPassword && hasAdminEmail && hasAuthSecret && hasNextAuthUrl;

  return NextResponse.json(
    {
      status: configured ? 'ok' : 'fail',
      timestamp: new Date().toISOString(),
      data: {
        configured,
        fields: {
          hasAdminUsername,
          hasAdminPassword,
          hasAdminEmail,
          hasAuthSecret,
          hasNextAuthUrl,
        },
      },
      message: configured ? 'auth config ready' : 'auth config missing required fields',
    },
    { status: configured ? 200 : 503 }
  );
}
