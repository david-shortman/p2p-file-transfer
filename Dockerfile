FROM node
COPY . .
RUN yarn install --frozen-lockfile
CMD node Server.js