FROM node
COPY . .
RUN npm i
EXPOSE 8085
CMD ["node", "Server.js"]