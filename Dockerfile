FROM node:latest

ADD package.json package.json
ADD package-lock.json package-lock.json

RUN npm install

ADD tsconfig.json tsconfig.json
COPY src src

RUN npm run build

CMD node ./dist/lib/index.js