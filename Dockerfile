FROM node:lts-alpine

ADD package.json package.json
ADD package-lock.json package-lock.json
RUN npm config set @taquito:registry https://npm.preview.tezostaquito.io/
RUN npm ci

ADD tsconfig.json tsconfig.json
COPY src src

RUN npm run build

CMD node ./dist/lib/index.js
