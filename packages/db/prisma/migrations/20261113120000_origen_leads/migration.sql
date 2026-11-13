-- Origen de los leads de la web (UTM, clic de anuncio, página de entrada y dominio de referencia).
ALTER TABLE "Lead" ADD COLUMN "utmSource" TEXT;
ALTER TABLE "Lead" ADD COLUMN "utmMedium" TEXT;
ALTER TABLE "Lead" ADD COLUMN "utmCampaign" TEXT;
ALTER TABLE "Lead" ADD COLUMN "utmContent" TEXT;
ALTER TABLE "Lead" ADD COLUMN "utmTerm" TEXT;
ALTER TABLE "Lead" ADD COLUMN "gclid" TEXT;
ALTER TABLE "Lead" ADD COLUMN "fbclid" TEXT;
ALTER TABLE "Lead" ADD COLUMN "landingPath" TEXT;
ALTER TABLE "Lead" ADD COLUMN "referrerHost" TEXT;
