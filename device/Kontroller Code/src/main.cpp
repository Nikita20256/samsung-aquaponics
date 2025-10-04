#include "mbed.h"
#include "BME280.h"
#include "OPT3001.h"
#include "TCPSocket.h"
#include "MQTTClientMbedOs.h"
#include "VL6180.h"

// Реле насоса\воздуха\света
DigitalOut ReleVoda(D7);
DigitalOut ReleVozdyx(D5);
DigitalOut ReleSvet(D6);

// Датчики
VL6180 rf(I2C_SDA, I2C_SCL);
OPT3001 sensor_opt(I2C_SDA, I2C_SCL);
BME280 sensor_bme(I2C_SDA, I2C_SCL);
AnalogIn soilMoisture(A0);
DigitalIn myVoda(D4);

// Wi-Fi
WiFiInterface *wifi;

// MQTT настройки
const char* hostname = "147.45.102.173";
int port = 1883;
const char* temperatureTopic = "aquaponics/dev1/temperature";
const char* humidityTopic = "aquaponics/dev1/humidity";
const char* lightTopic = "aquaponics/dev1/light";
const char* waterTopic = "aquaponics/dev1/water";
const char* lightSwitchCountTopic = "aquaponics/dev1/VklSvet";

// Режимы работы света и аэрации
char lightMode[5] = "auto";
char aerationMode[5] = "auto";

// Флаг предыдущего состояния света для подсчёта включений
bool lightWasOn = false;

// Обработчик входящих управляющих сообщений
void controlMessageArrived(MQTT::MessageData& md) {
    MQTT::Message &message = md.message;
    char topic[100] = {0};
    memcpy(topic, md.topicName.lenstring.data, md.topicName.lenstring.len);
    char payload[10] = {0};
    memcpy(payload, message.payload, message.payloadlen);

    printf("Получено управляющее сообщение: %s на теме %s\r\n", payload, topic);

    if (strstr(topic, "/control/light") != NULL) {
        if (strcmp(payload, "on") == 0 || strcmp(payload, "off") == 0 || strcmp(payload, "auto") == 0) {
            strcpy(lightMode, payload);
            printf("Режим света установлен: %s\r\n", lightMode);
        }
    } else if (strstr(topic, "/control/aeration") != NULL) {
        if (strcmp(payload, "on") == 0 || strcmp(payload, "off") == 0 || strcmp(payload, "auto") == 0) {
            strcpy(aerationMode, payload);
            printf("Режим аэрации установлен: %s\r\n", aerationMode);
        }
    }
}

void mqtt_demo(NetworkInterface *net) {
    TCPSocket socket;
    MQTTClient client(&socket);

    SocketAddress a;
    net->gethostbyname(hostname, &a);
    a.set_port(port);
    printf("Подключение к %s:%d\r\n", hostname, port);

    int rc = socket.open(net);
    if (rc != 0) {
        printf("Ошибка открытия сокета: %d\r\n", rc);
        return;
    }

    rc = socket.connect(a);
    if (rc != 0) {
        printf("Ошибка TCP-подключения: %d\r\n", rc);
        return;
    }

    MQTTPacket_connectData data = MQTTPacket_connectData_initializer;
    data.MQTTVersion = 4;
    data.clientID.cstring = const_cast<char*>("nucleo_temp_sensor");
    data.username.cstring = const_cast<char*>("device1");
    data.password.cstring = const_cast<char*>("aqua");

    rc = client.connect(data);
    if (rc != 0) {
        printf("Ошибка подключения MQTT: %d\r\n", rc);
        return;
    }
    printf("MQTT подключен\r\n");

    // Подписка на управляющие топики
    rc = client.subscribe("aquaponics/dev1/control/light", MQTT::QOS1, controlMessageArrived);
    if (rc != 0) printf("Ошибка подписки на управление светом: %d\r\n", rc);

    rc = client.subscribe("aquaponics/dev1/control/aeration", MQTT::QOS1, controlMessageArrived);
    if (rc != 0) printf("Ошибка подписки на управление аэрацией: %d\r\n", rc);

    MQTT::Message message;
    char buf[100];
    char buf2[100];
    char buf3[100];
    char bufCount[10];
    int x = 0;

    myVoda.mode(PullUp);

    while (true) {
        // Чтение и отправка данных света
        float suet = sensor_opt.readSensor();
        sprintf(buf, "%.0f", suet);
        printf("Свет: %.2f ", suet);
        message.payload = (void*)buf;
        message.payloadlen = strlen(buf) + 1;
        rc = client.publish(lightTopic, message);
        if (rc != 0) printf("Ошибка публикации света: %d\r\n", rc);
        else printf("Отправлен свет: %s\r\n", buf);

        // Чтение и отправка влажности
        float moisture = soilMoisture.read();
        float fixMoisture = moisture * 100;
        sprintf(buf2, "%.0f", fixMoisture);
        printf("Влажность: %2.2f ", fixMoisture);
        message.payload = (void*)buf2;
        message.payloadlen = strlen(buf2) + 1;
        rc = client.publish(humidityTopic, message);
        if (rc != 0) printf("Ошибка публикации влажности: %d\r\n", rc);
        else printf("Отправлена влажность: %s\r\n", buf2);

        // Чтение и отправка температуры
        float temperature = sensor_bme.getTemperature();
        sprintf(buf3, "%.2f", temperature);
        printf("Температура: %.2f\r\n", temperature);
        message.payload = (void*)buf3;
        message.payloadlen = strlen(buf3) + 1;
        rc = client.publish(temperatureTopic, message);
        if (rc != 0) printf("Ошибка публикации температуры: %d\r\n", rc);
        else printf("Отправлена температура: %s\r\n", buf3);

        // Чтение и отправка уровня воды
        float YrVod = myVoda.read();
        sprintf(bufCount, "%.0f", YrVod);
        printf("Уровень воды: %2.2f ", YrVod);
        message.payload = (void*)bufCount;
        message.payloadlen = strlen(bufCount) + 1;
        rc = client.publish(waterTopic, message);
        if (rc != 0) printf("Ошибка публикации уровня воды: %d\r\n", rc);
        else printf("Отправлен уровень воды: %s\r\n", bufCount);

        // Управление светом с подсчётом включений и отладкой ручного управления
        bool lightOnNow = false;
        if (strcmp(lightMode, "on") == 0) {
            ReleSvet = 0;
            lightOnNow = true;
            printf("Ручное ВКЛЮЧЕНИЕ света\r\n");
        } else if (strcmp(lightMode, "off") == 0) {
            ReleSvet = 1;
            lightOnNow = false;
            printf("Ручное ОТКЛЮЧЕНИЕ света\r\n");
        } else {
            if (suet < 150) {
                ReleSvet = 0;
                lightOnNow = true;
            } else {
                ReleSvet = 1;
                lightOnNow = false;
            }
        }

        if (lightOnNow && !lightWasOn) {
            sprintf(bufCount, "1");
            printf("Счётчик включений света: +1\r\n");
            message.payload = (void*)bufCount;
            message.payloadlen = strlen(bufCount) + 1;
            rc = client.publish(lightSwitchCountTopic, message);
            if (rc != 0) printf("Ошибка публикации счетчика включений света: %d\r\n", rc);
            else printf("Отправлен счетчик включений света\r\n");
        }
        lightWasOn = lightOnNow;

        // Управление насосом
        if (fixMoisture >= 50) {
            ReleVoda = 1;
        } else {
            ReleVoda = 0;
        }

        // Управление аэрацией с отладкой ручного управления
        if (strcmp(aerationMode, "on") == 0) {
            ReleVozdyx = 0;
            printf("Ручное ВКЛЮЧЕНИЕ аэрации\r\n");
        } else if (strcmp(aerationMode, "off") == 0) {
            ReleVozdyx = 1;
            printf("Ручное ОТКЛЮЧЕНИЕ аэрации\r\n");
        } else {
            if (x < 180) {
                ReleVozdyx = 1;
                x++;
            } else if (x < 360) {
                ReleVozdyx = 0;
                x++;
            } else {
                x = 0;
            }
        }

        ThisThread::sleep_for(1s);
        client.yield(100);
    }
}

int main() {
    wifi = WiFiInterface::get_default_instance();
    if (!wifi) {
        printf("ОШИБКА: WiFi-интерфейс не найден.\r\n");
        return -1;
    }

    printf("Подключение к %s...\r\n", MBED_CONF_APP_WIFI_SSID);
    int ret = wifi->connect(MBED_CONF_APP_WIFI_SSID, MBED_CONF_APP_WIFI_PASSWORD, NSAPI_SECURITY_WPA_WPA2);
    if (ret != 0) {
        printf("Ошибка подключения к WiFi: %d\r\n", ret);
        return -1;
    }

    SocketAddress ip;
    wifi->get_ip_address(&ip);
    printf("WiFi подключен\r\n");
    printf("IP: %s\r\n", ip.get_ip_address() ? ip.get_ip_address() : "Не удалось получить IP");

    mqtt_demo(wifi);

    wifi->disconnect();
    printf("Готово\r\n");
    return 0;
}
