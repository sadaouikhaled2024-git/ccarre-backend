import { JwtPayload } from '../utils/jwt';
import { Multer } from 'multer';

/**
 * Extension du type Request d'Express pour inclure l'utilisateur authentifié.
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      file?: Multer.File;
      files?: Multer.File[];
    }
  }
}
