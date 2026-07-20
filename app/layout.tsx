import type { Metadata } from 'next';
import './styles.css';
import './assessment.css';
import './workflow.css';
import './readability.css';
import './dashboard.css';
export const metadata: Metadata = { title: 'ACSA Evaluation', description: 'CRVS solution assessment workspace' };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html> }
