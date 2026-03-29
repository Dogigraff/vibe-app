import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'VIBE — найди свою тусовку за 5 минут';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0F0F0F',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Центральный контент */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            marginTop: 40,
          }}
        >
          <div
            style={{
              fontSize: 180,
              fontWeight: 900,
              letterSpacing: '-0.05em',
              background: 'linear-gradient(to right, #7C3AED, #3B82F6)',
              backgroundClip: 'text',
              color: 'transparent',
              marginBottom: 10,
              lineHeight: 1,
            }}
          >
            VIBE
          </div>
          <div
            style={{
              fontSize: 54,
              fontWeight: 600,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              marginBottom: 24,
              textAlign: 'center',
            }}
          >
            Найди свою тусовку за 5 минут
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: '#A1A1AA',
              letterSpacing: '0.02em',
            }}
          >
            Геосоциальная сеть · Telegram Mini App
          </div>
        </div>

        {/* Нижний правый блок */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 48,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginRight: 16 }}
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <div
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: '#D4D4D8',
            }}
          >
            Открой карту. Найди людей рядом.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
