import { ImageResponse } from 'next/og';

export const alt = 'Unbilled — every favor has a price, now you can see it';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#F5F0E6',
          padding: '64px 72px',
          fontFamily: 'Helvetica, Arial, sans-serif',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: -120,
            top: -140,
            width: 520,
            height: 520,
            borderRadius: 999,
            background: 'rgba(209,71,39,0.12)',
            display: 'flex',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: '#14161A', letterSpacing: -1 }}>
            <span>unbilled</span>
            <span style={{ color: '#D14727' }}>.</span>
          </div>
          <div style={{ fontSize: 18, color: '#7d7a70', letterSpacing: 3, textTransform: 'uppercase' }}>the free-work ledger</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 78,
              lineHeight: 1.02,
              color: '#14161A',
              fontWeight: 700,
              letterSpacing: -3,
              maxWidth: 900,
            }}
          >
            <span>Every favor has a price.</span>
            <span>Now you can see it.</span>
          </div>
          <div style={{ fontSize: 26, color: '#454a52', maxWidth: 820, lineHeight: 1.35 }}>
            Paste the client message. Unbilled finds every hidden request, checks it against your scope, prices it at your
            rate — and writes the reply.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {['Outside scope: $380', 'Rush +50%', 'Change order ready'].map((label) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  padding: '10px 18px',
                  borderRadius: 999,
                  border: '1px solid #DDD5C6',
                  backgroundColor: '#FFFCF6',
                  color: '#454A52',
                  fontSize: 20,
                }}
              >
                {label}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', fontSize: 22, color: '#7d7a70' }}>unbilled.app</div>
        </div>
      </div>
    ),
    size,
  );
}
