#!/bin/sh
# Mosquitto entrypoint — creates hashed password file from env vars

PASSWD_FILE=/mosquitto/config/passwd

if [ -n "$MQTT_USER" ] && [ -n "$MQTT_PASSWORD" ]; then
    mosquitto_passwd -b -c "$PASSWD_FILE" "$MQTT_USER" "$MQTT_PASSWORD"
    chmod 0644 "$PASSWD_FILE"
    echo "MQTT: password file created for user '$MQTT_USER'"
else
    echo "MQTT: WARNING — no credentials provided, anonymous access enabled"
    touch "$PASSWD_FILE"
fi

exec mosquitto -c /mosquitto/config/mosquitto.conf
