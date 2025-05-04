import React from 'react';

// Define Theme type locally or import if shared
interface Theme {
  colors: {
    bloodRed: string;
    bloodShadowDark: string;
    bloodShadowMid: string;
    bloodShadowLight: string;
  };
  fonts: {
    header: string;
  };
}

interface HeaderProps {
  theme: Theme;
}

const Header: React.FC<HeaderProps> = ({ theme }) => {
  // Define the complex text shadow for the blood drip effect
  const bloodDripShadow = `
    1px 1px 1px ${theme.colors.bloodShadowDark},
    0px 2px 1px ${theme.colors.bloodShadowDark},
    0px 4px 3px ${theme.colors.bloodShadowMid},
    0px 6px 5px ${theme.colors.bloodShadowLight},
    0px 8px 8px ${theme.colors.bloodShadowLight}
  `;

  return (
    <div className="mb-4 text-center">
      <h1
        className="text-4xl font-bold"
        style={{
          color: theme.colors.bloodRed,
          fontFamily: theme.fonts.header,
          textShadow: bloodDripShadow,
          // Optional: Add a very slight rotation for unease
          // transform: 'rotate(-1deg)',
        }}
      >
        Created By 0hmX
      </h1>
    </div>
  );
};

export default Header;