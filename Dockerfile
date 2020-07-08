ARG NODEJS_VERSION
FROM mhart/alpine-node:${NODEJS_VERSION} as build
WORKDIR /app

COPY package.json ./
RUN npm install
COPY . ./
RUN ./node_modules/.bin/grunt
RUN ./node_modules/.bin/grunt test
RUN ./node_modules/.bin/grunt build

FROM mhart/alpine-node:${NODEJS_VERSION} as deploy
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]

WORKDIR /app
RUN addgroup nonroot && \
    adduser -D nonroot -G nonroot && \
    chown nonroot:nonroot /app

RUN apk update && \
    apk add --no-cache iputils

USER nonroot

RUN mkdir -p /home/nonroot/.npm
VOLUME /home/nonroot/.npm
COPY package.json ./
RUN npm install --production
COPY --chown=nonroot:nonroot --from=build /app/built /app/
