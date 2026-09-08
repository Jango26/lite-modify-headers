import {createRoot} from 'react-dom/client';
import '../index.css';
import {bootTheme} from '../lib/theme';
import {Menu} from './Menu';

bootTheme();
createRoot(document.getElementById('root')!).render(<Menu />);
