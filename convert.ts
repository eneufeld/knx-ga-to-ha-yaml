import fs from 'fs';
import csvParser from 'csv-parser';
import yaml from 'yaml';

interface KnxEntry {
    description: string;
    address: string;
    empty1: string;
    empty2: string;
    group: string;
    dpt: string;
    auto: string;
}

interface YamlEntry {
    name: string;
    address?: string;
    state_address?: string;
    brightness_address?: string;
    brightness_state_address?: string;
    temperature_address?: string;
    target_temperature_state_address?: string;
    setpoint_shift_address?: string;
    setpoint_shift_state_address?: string;
    operation_mode_address?: string;
    operation_mode_state_address?: string;
    operation_mode_frost_protection_address?: string;
    operation_mode_night_address?: string;
    operation_mode_comfort_address?: string;
}

const parseCSV = (filePath: string): Promise<KnxEntry[]> => {
    return new Promise((resolve, reject) => {
        const results: KnxEntry[] = [];
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                resolve(results);
            })
            .on('error', (err) => {
                reject(err);
            });
    });
};

const convertToYaml = (entries: KnxEntry[]): string => {
    const lights: YamlEntry[] = [];
    const fans: YamlEntry[] = [];
    const switches: YamlEntry[] = [];
    const climate: YamlEntry[] = [];

    const groupedEntries: { [key: string]: YamlEntry } = {};

    entries.forEach(entry => {
        // Ignore entries with "-" or "---"
        if (entry.description.endsWith('dim') || entry.description.endsWith('---') || entry.description.endsWith('-')) {
            return;
        }

        // Extract the base description (remove suffixes and trim)
        const baseDescription = entry.description
            .replace(/ sch.*$| RMsch.*$| wert.*$| RMwert.*$/, '') // Remove these suffixes
            .replace(/ - .*$/, '') // Remove text starting from ' - ' to end of line
            .trim();

        if (!groupedEntries[baseDescription]) {
            groupedEntries[baseDescription] = { name: baseDescription };
        }

        if (entry.address.startsWith('5/')) {
            if (entry.description.endsWith('Temperaturwert empfangen')) {
                groupedEntries[baseDescription].temperature_address = entry.address;
            } else if (entry.description.endsWith('Sollwert vorgeben')) {
                groupedEntries[baseDescription].setpoint_shift_address = entry.address;
            } else if (entry.description.endsWith('Status Sollwertverschiebung')) {
                groupedEntries[baseDescription].setpoint_shift_state_address = entry.address;
            } else if (entry.description.endsWith('Aktueller Sollwert senden')) {
                groupedEntries[baseDescription].target_temperature_state_address  = entry.address;
            } else if (entry.description.endsWith('Betriebsartvorwahl')) {
                groupedEntries[baseDescription].operation_mode_state_address = entry.address;
            } else if (entry.description.endsWith('Betriebsart Frostschutz schalten')) {
                groupedEntries[baseDescription].operation_mode_frost_protection_address = entry.address;
            } else if (entry.description.endsWith('Betriebsart Nacht schalten')) {
                groupedEntries[baseDescription].operation_mode_night_address = entry.address;
            } else if (entry.description.endsWith('Betriebsart Komfort schalten')) {
                groupedEntries[baseDescription].operation_mode_comfort_address = entry.address;
            }
        } else if (entry.description.match(/sch\b/i)) {
            if (entry.description.endsWith('RMsch')) {
                groupedEntries[baseDescription].state_address = entry.address;
            } else {
                groupedEntries[baseDescription].address = entry.address;
            }
        } else if (entry.description.match(/wert\b/i)) {
            if (entry.description.endsWith('RMwert')) {
                groupedEntries[baseDescription].brightness_state_address = entry.address;
            } else {
                groupedEntries[baseDescription].brightness_address = entry.address;
            }
        }
    });

    Object.values(groupedEntries).forEach(entry => {
        if (!entry.address && !entry.temperature_address) {
            return; // Skip entries without address
        }

        // Determine category based on description
        if (/Beleuchtung/i.test(entry.name) || /licht/i.test(entry.name)) {
            if (!/steckdose/i.test(entry.name)) {
                lights.push(entry);
            }
        } else if (/luefter/i.test(entry.name)) {
            fans.push(entry);
        } else if (/steckdose/i.test(entry.name)) {
            switches.push(entry);
        } else if (entry.temperature_address?.startsWith('5/')) {
            // Handle climate entries starting with "5/"
            climate.push(entry);
        }
    });

    const knxObject = {
        light: lights.map(entry => ({
            name: entry.name,
            address: entry.address,
            state_address: entry.state_address,
            brightness_address: entry.brightness_address,
            brightness_state_address: entry.brightness_state_address
        })),
        fan: fans.map(entry => ({
            name: entry.name,
            address: entry.address,
            state_address: entry.state_address,
            brightness_address: entry.brightness_address,
            brightness_state_address: entry.brightness_state_address
        })),
        switch: switches.map(entry => ({
            name: entry.name,
            address: entry.address,
            state_address: entry.state_address,
            brightness_address: entry.brightness_address,
            brightness_state_address: entry.brightness_state_address
        })),
        climate: climate.map(entry => ({
            name: entry.name,
            temperature_address: entry.temperature_address,
            target_temperature_state_address: entry.target_temperature_state_address,
            setpoint_shift_address: entry.setpoint_shift_address,
            setpoint_shift_state_address: entry.setpoint_shift_state_address,
            operation_mode_address: entry.operation_mode_address,
            operation_mode_state_address: entry.operation_mode_state_address,
            operation_mode_frost_protection_address: entry.operation_mode_frost_protection_address,
            operation_mode_night_address: entry.operation_mode_night_address,
            operation_mode_comfort_address: entry.operation_mode_comfort_address
        }))
    };

    return yaml.stringify(knxObject, { indent: 2 });
};

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
