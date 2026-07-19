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

# Create a startup script that handles the Aiven SSL certificate dynamically
# This prevents us from having to commit binary secrets (client-truststore.jks) to Git.
# Render Secret Files should mount the Aiven ca.pem to /etc/secrets/ca.pem
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'export BASE_URL="jdbc:mysql://${DB_HOST:localhost}:${DB_PORT:3306}/${DB_NAME:cinebook}"' >> /app/start.sh && \
    echo 'if [ -f "/etc/secrets/ca.pem" ]; then' >> /app/start.sh && \
    echo '  echo "Aiven CA certificate found. Generating truststore..."' >> /app/start.sh && \
    echo '  keytool -import -alias aiven -file /etc/secrets/ca.pem -keystore /app/truststore.jks -storepass secret -noprompt' >> /app/start.sh && \
    echo '  export SPRING_DATASOURCE_URL="${BASE_URL}?sslMode=VERIFY_IDENTITY&trustCertificateKeyStoreUrl=file:/app/truststore.jks&trustCertificateKeyStoreType=JKS&trustCertificateKeyStorePassword=secret&serverTimezone=Asia/Kolkata"' >> /app/start.sh && \
    echo 'else' >> /app/start.sh && \
    echo '  echo "Warning: /etc/secrets/ca.pem not found. Proceeding with default JVM truststore (sslMode=REQUIRED)."' >> /app/start.sh && \
    echo '  export SPRING_DATASOURCE_URL="${BASE_URL}?sslMode=REQUIRED&serverTimezone=Asia/Kolkata"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo 'exec java -jar app.jar' >> /app/start.sh && \
    chmod +x /app/start.sh

ENTRYPOINT ["/app/start.sh"]
