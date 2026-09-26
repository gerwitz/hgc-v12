# syntax=docker/dockerfile:1.7

ARG SMOLHOST_IMAGE=ghcr.io/gerwitz/smolhost:latest

FROM node:22.15-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
ENV ELEVENTY_ENV=production
RUN npm run build

FROM ${SMOLHOST_IMAGE} AS runtime

ENV MEDIA_ORIGIN_HOST=your-bucket.s3.fr-par.scw.cloud

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/_site/nginx/redirects.conf /etc/nginx/redirects.conf
COPY --from=build /app/_site /usr/share/nginx/html
COPY --from=build /app/_site/editions/gemini /srv/smallweb

EXPOSE 80 1965 3000

HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -fsS http://127.0.0.1/healthz > /dev/null && nc -z -w 2 127.0.0.1 1965 && nc -z -w 2 127.0.0.1 3000 || exit 1
