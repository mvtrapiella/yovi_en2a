FROM maven:3.9.6-eclipse-temurin-17
WORKDIR /gatling
COPY pom.xml .
RUN mvn dependency:resolve -q
COPY src ./src
ENTRYPOINT ["mvn", "gatling:test"]
