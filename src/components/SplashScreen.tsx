import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    // Start fade out after 2.2 seconds (to finish at 3s)
    const fadeTimer = setTimeout(() => {
      setOpacity(0);
    }, 2200);

    // Call onComplete after 3 seconds
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #fdfcfb 0%, #e2d1c3 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        transition: 'opacity 0.8s ease-in-out',
        opacity: opacity,
      }}
    >
      <div
        style={{
          textAlign: 'center',
          animation: 'fadeInUp 1.2s ease-out forwards',
        }}
      >
        <img
          src="/logo.png"
          alt="Slip in Bloom Logo"
          style={{
            width: '300px',
            marginBottom: '2rem',
            filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))',
          }}
        />
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '2.5rem',
            color: '#5d4037',
            fontWeight: '300',
            letterSpacing: '0.2em',
            margin: 0,
          }}
        >
          SLIP IN BLOOM
        </h1>
        <div
          style={{
            width: '40px',
            height: '2px',
            background: '#8d6e63',
            margin: '1.5rem auto',
          }}
        />
        <p
          style={{
            fontSize: '1rem',
            color: '#8d6e63',
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          Mocktail Bar
        </p>
      </div>

      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap');
        `}
      </style>
    </div>
  );
};
