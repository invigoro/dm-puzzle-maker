// Adds DOM matchers such as toBeInTheDocument() to Vitest's expect.
import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/dom';

// Waiting for the page (findBy…, waitFor) allows three seconds rather than one, as fingerprints
// and slower machines, such as CI's, can take a while.
configure({ asyncUtilTimeout: 3000 });
