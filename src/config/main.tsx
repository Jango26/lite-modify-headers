import {createRoot} from 'react-dom/client';
import '../index.css';
import {bootTheme} from '../lib/theme';
import {App} from './App';

bootTheme();
createRoot(document.getElementById('root')!).render(<App />);
