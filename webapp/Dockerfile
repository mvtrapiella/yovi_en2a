# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

# Install deps
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copy sources
COPY . .

# Accept build-time API url (defaults to localhost:3000)
ARG VITE_API_URL="http://localhost:3000"
RUN export VITE_API_URL=${VITE_API_URL} && npm run build

# Production image
FROM nginx:stable-alpine

# Download the sslip.io publicly trusted wildcard certificate and key
RUN apk add --no-cache wget && \
    mkdir -p /etc/nginx/ssl && \
    wget -qO /etc/nginx/ssl/sslip.pem \
      https://raw.githubusercontent.com/cunnie/sslip.io/main/etc/nginx/ssl/sslip.io%2Bchain.pem && \
    wget -qO /etc/nginx/ssl/sslip.key \
      https://raw.githubusercontent.com/cunnie/sslip.io/main/etc/nginx/ssl/sslip.io.key

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
