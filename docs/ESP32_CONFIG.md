# 🔧 Configuração do ESP32

## Esquema de Ligação

```
ESP32 DevKit v1
├── GPIO 19 → Teclado Row 1
├── GPIO 18 → Teclado Row 2  
├── GPIO 5  → Teclado Row 3
├── GPIO 17 → Teclado Row 4
├── GPIO 16 → Teclado Col 1
├── GPIO 4  → Teclado Col 2
├── GPIO 2  → Teclado Col 3
├── GPIO 15 → Teclado Col 4
├── GPIO 22 → Buzzer (+)
├── GPIO 21 → LED Verde
├── GPIO 23 → LED Vermelho
├── GND     → Buzzer (-), LEDs (-)
└── VCC     → Alimentação 5V
```

## Lista de Componentes

| Item | Quantidade | Especificação |
|------|------------|---------------|
| ESP32 DevKit | 1 | v1 ou v4 |
| Teclado Matricial | 1 | 4x4 (16 teclas) |
| Buzzer | 1 | 5V ativo |
| LEDs | 2 | Verde e Vermelho |
| Resistores | 2 | 220Ω |
| Protoboard | 1 | 830 pontos |
| Jumpers | 20 | Macho-macho |
| Fonte | 1 | 5V 2A |

## Configuração WiFi

```cpp
// Substituir pelas suas credenciais
const char* ssid = "NOME_DA_SUA_REDE";
const char* password = "SENHA_DA_SUA_REDE";
const char* apiUrl = "https://sua-api.onrender.com";
```

## Teste de Conectividade

```cpp
void testarConexao() {
  Serial.println("Testando conexão com API...");
  
  HTTPClient http;
  http.begin(String(apiUrl) + "/health");
  
  int httpCode = http.GET();
  if (httpCode == 200) {
    Serial.println("✅ Conexão OK!");
  } else {
    Serial.println("❌ Erro na conexão: " + String(httpCode));
  }
  
  http.end();
}
```