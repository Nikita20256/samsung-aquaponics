FROM eclipse-mosquitto:2

# Copy config and entrypoint, fix CRLF, set permissions
COPY mosquitto.conf /tmp/mosquitto_raw.conf
COPY entrypoint.sh /tmp/entrypoint_raw.sh

RUN sed 's/\r$//' /tmp/mosquitto_raw.conf > /mosquitto/config/mosquitto.conf \
    && sed 's/\r$//' /tmp/entrypoint_raw.sh > /docker-entrypoint.sh \
    && chmod +x /docker-entrypoint.sh \
    && chown mosquitto:mosquitto /mosquitto/config/mosquitto.conf \
    && chown mosquitto:mosquitto /mosquitto/config/ \
    && rm /tmp/mosquitto_raw.conf /tmp/entrypoint_raw.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
