FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL=/api
ARG VITE_STRIPE_PUBLISHABLE_KEY=
ARG VITE_SENTRY_DSN=
ARG VITE_SENTRY_TRACES_SAMPLE_RATE=0

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_SENTRY_TRACES_SAMPLE_RATE=$VITE_SENTRY_TRACES_SAMPLE_RATE

COPY package*.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src

RUN npm run build

FROM nginx:1.27-alpine AS production

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
