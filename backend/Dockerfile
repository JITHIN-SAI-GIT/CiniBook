# Stage 1: Build the application
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
# Download dependencies first for caching
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run the application
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy the built jar from the build stage
COPY --from=build /app/target/cinebook-backend-1.0.0.jar app.jar

# Expose the dynamic port
EXPOSE $PORT

# Enforce the render profile for production deployments
ENV SPRING_PROFILES_ACTIVE=render

ENTRYPOINT ["java", "-Xmx300m", "-Xms150m", "-jar", "app.jar"]
