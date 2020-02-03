FROM node:latest

COPY dist/api.js api.js

CMD node api.js