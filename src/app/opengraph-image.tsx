import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FUT Draft — Free FIFA 16-style draft. Chase 194.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
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
          background: 'linear-gradient(160deg, #08161f 0%, #0b2734 48%, #07151e 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 120,
            background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(120,210,245,0.25), transparent)',
          }}
        />
        <div style={{ fontSize: 36, color: 'rgba(255,255,255,0.5)', letterSpacing: 12, marginBottom: 8 }}>
          FUT
        </div>
        <div
          style={{
            fontSize: 120,
            fontWeight: 800,
            color: '#e2ae16',
            letterSpacing: -2,
            textShadow: '0 0 40px rgba(226,174,22,0.5)',
          }}
        >
          DRAFT
        </div>
        <div style={{ fontSize: 32, color: 'rgba(255,255,255,0.7)', marginTop: 24 }}>
          Build your squad. Chase 194.
        </div>
        <div style={{ fontSize: 22, color: 'rgba(47,208,230,0.8)', marginTop: 16 }}>
          Free · No coins · Today&apos;s players · UCL bracket
        </div>
      </div>
    ),
    { ...size }
  );
}
