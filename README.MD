# What is this about

This Repo provides a simple util that takes the KNX CSV file containing "Group Addresses" and converts them to the format defined by [HA KNX](https://www.home-assistant.io/integrations/knx/).

This is a first draft that was tailored to my needs.

If you want to use it, feel free to do so. If you like it and meet me, you can buy me a beer.

If you want to contribute, feel free to open a PR, fork it or do what you want with it.

## How It Works

1. **Dependencies**:
   - `fs`: File system operations.
   - `csv-parser`: CSV file parsing.
   - `yaml`: YAML formatting.

2. **Data Structures**:
   - `KnxEntry`: Represents an entry from the CSV file.
   - `YamlEntry`: Represents a YAML entry with various optional KNX addresses.

3. **CSV Parsing**:
   - The `parseCSV` function reads the CSV file and converts each row into a `KnxEntry` object.

4. **Conversion to YAML**:
   - The `convertToYaml` function processes the `KnxEntry` objects:
     - Filters and normalizes entries.
     - Groups entries by their descriptions.
     - Maps addresses to specific fields based on description patterns.
     - Categorizes entries into `lights`, `fans`, `switches`, and `climate`.

5. **YAML Output**:
   - The structured data is saved as `knx.yaml`.

## Usage

To run the conversion:

```typescript
const main = async () => {
    try {
        const entries = await parseCSV('files/GA_240714.csv');
        const yamlContent = convertToYaml(entries);
        fs.writeFileSync('files/knx.yaml', yamlContent, 'utf8');
        console.log('YAML file created successfully.');
    } catch (error) {
        console.error('Error:', error);
    }
};

main();
```

## Current feature set

The script currently transforms
- [lights](https://www.home-assistant.io/integrations/knx/#light)
- [fans](https://www.home-assistant.io/integrations/knx/#fan)
- [switches](https://www.home-assistant.io/integrations/knx/#switch)
- [climate](https://www.home-assistant.io/integrations/knx/#climate)

group addresses. To do so it assumes a german naming scheme.

## Entry Matching Rules

The code processes entries from a CSV file and converts them into a structured YAML format. Here are the rules used to match and categorize the different entries:

### Ignoring Certain Entries

- Entries with descriptions ending in "dim", "---", or "-" are ignored.

### Normalizing Descriptions

- The base description is extracted by removing specific suffixes and patterns:
  - Suffixes like " sch", " RMsch", " wert", " RMwert" are removed.
  - Text starting from " - " to the end of the line is removed.
  - The resulting description is trimmed of whitespace.

### Address Mapping

#### Temperature-related addresses (starting with "5/")

- Ends with "Temperaturwert empfangen": `temperature_address`.
- Ends with "Sollwert vorgeben": `setpoint_shift_address`.
- Ends with "Status Sollwertverschiebung": `setpoint_shift_state_address`.
- Ends with "Aktueller Sollwert senden": `target_temperature_state_address`.
- Ends with "Betriebsartvorwahl": `operation_mode_state_address`.
- Ends with "Betriebsart Frostschutz schalten": `operation_mode_frost_protection_address`.
- Ends with "Betriebsart Nacht schalten": `operation_mode_night_address`.
- Ends with "Betriebsart Komfort schalten": `operation_mode_comfort_address`.

#### Switch-related descriptions (contains "sch")

- Ends with "RMsch": `state_address`.
- Otherwise: `address`.

#### Brightness-related descriptions (contains "wert")

- Ends with "RMwert": `brightness_state_address`.
- Otherwise: `brightness_address`.

### Categorizing Entries

#### Lights

- Descriptions containing "Beleuchtung" or "licht" (case-insensitive), but not containing "steckdose".

#### Fans

- Descriptions containing "luefter" (case-insensitive).

#### Switches

- Descriptions containing "steckdose" (case-insensitive).

#### Climate

- Entries with `temperature_address` starting with "5/".

### Creating YAML Structure

- Entries are categorized into arrays (`lights`, `fans`, `switches`, `climate`).
- Each category contains entries with relevant addresses:
  - **Light, Fan, Switch** entries include `name`, `address`, `state_address`, `brightness_address`, and `brightness_state_address`.
  - **Climate** entries include `name`, `temperature_address`, `target_temperature_state_address`, `setpoint_shift_address`, `setpoint_shift_state_address`, `operation_mode_address`, `operation_mode_state_address`, `operation_mode_frost_protection_address`, `operation_mode_night_address`, and `operation_mode_comfort_address`.

