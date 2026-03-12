import { NextResponse } from 'next/server';

const normalizeEnvValue = (value: string | undefined | null): string => {
  if (!value) {
    return '';
  }
  const withoutCarriageReturn = value.replace(/\r/g, '').trim();
  const isWrappedByDoubleQuotes =
    withoutCarriageReturn.startsWith('"') && withoutCarriageReturn.endsWith('"');
  const isWrappedBySingleQuotes =
    withoutCarriageReturn.startsWith("'") && withoutCarriageReturn.endsWith("'");

  if (isWrappedByDoubleQuotes || isWrappedBySingleQuotes) {
    return withoutCarriageReturn.slice(1, -1).trim().trim();
  }
  return withoutCarriageReturn;
};

export async function POST(req: Request) {
  const authSecret = normalizeEnvValue(process.env.AUTH_SECRET);
  const authHeader = normalizeEnvValue(req.headers.get('x-auth-diagnose-key'));

  if (!authSecret || authHeader !== authSecret) {
    return NextResponse.json(
      {
        status: 'fail',
        message: 'unauthorized',
      },
      { status: 403 }
    );
  }

  try {
    const body = (await req.json()) as { username?: string; password?: string };
    const username = normalizeEnvValue(body?.username);
    const password = normalizeEnvValue(body?.password);

    const adminUsername = normalizeEnvValue(process.env.ADMIN_USERNAME);
    const adminPassword = normalizeEnvValue(process.env.ADMIN_PASSWORD);

    const matched = Boolean(
      username && password && adminUsername && adminPassword && username === adminUsername && password === adminPassword
    );

    return NextResponse.json(
      {
        status: matched ? 'ok' : 'fail',
        data: {
          matched,
        },
        message: matched ? 'credentials matched' : 'invalid credentials',
      },
      { status: matched ? 200 : 401 }
    );
  } catch {
    return NextResponse.json(
      {
        status: 'fail',
        message: 'invalid payload',
      },
      { status: 400 }
    );
  }
}
