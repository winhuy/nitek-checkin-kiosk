import { PullCord } from 'pullcord';
import 'pullcord/pullcord.css';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemePullCord() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <PullCord
      onPull={toggleTheme}
      pulled={!isDark}
      ariaLabel={isDark ? 'Chuyển sang chế độ sáng (Light Mode)' : 'Chuyển sang chế độ tối (Dark Mode)'}
      config={{
        gravity: 1250,   // hang tension / fall speed
        damping: 0.94,   // the snap: higher = snappier retract
        iterations: 20,  // rope stiffness
        stretchMax: 26,  // pull travel past rest
      }}
    />
  );
}
