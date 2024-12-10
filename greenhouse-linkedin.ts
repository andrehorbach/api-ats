import axios from 'axios';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

interface WebsiteAddress {
    value: string;
    type: string;
}

interface SocialMediaAddress {
    value: string;
}

interface Candidate {
    id: number;
    first_name: string;
    last_name: string;
    website_addresses: WebsiteAddress[];
    social_media_addresses: SocialMediaAddress[];
}

interface ExtractedData {
    id: number;
    first_name: string;
    last_name: string;
    website_addresses: { value: string }[];
    social_media_addresses: { value: string }[];
}

async function fetchCandidates(apiUrl: string, apiKey: string): Promise<Candidate[]> {
    let candidates: Candidate[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
        try {
            const response = await axios.get(apiUrl, {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    page: page,
                    per_page: perPage
                }
            });
            console.log(`starting page ${page}...`);

            if (response.data.length === 0) {
                break;
            }

            candidates = candidates.concat(response.data);
            page++;
        } catch (error) {
            console.error('Error retrieving candidates:', error);
            break;
        }
    }

    return candidates;
}

function extractLinkedInInfo(candidates: Candidate[]): ExtractedData[] {
    return candidates.map(candidate => {
        const websiteAddresses = candidate.website_addresses.filter(address =>
            address.value.includes('linkedin.com')
        ).map(address => ({ value: address.value }));

        const socialMediaAddresses = candidate.social_media_addresses.filter(address =>
            address.value.includes('linkedin.com')
        ).map(address => ({ value: address.value }));

        return {
            id: candidate.id,
            first_name: candidate.first_name,
            last_name: candidate.last_name,
            website_addresses: websiteAddresses,
            social_media_addresses: socialMediaAddresses
        };
    });
}

async function saveToFile(data: ExtractedData[], filename: string) {
    try {
        await fs.promises.writeFile(filename, JSON.stringify(data, null, 2));
        console.log(`Data successfully saved to ${filename}`);
    } catch (error) {
        console.error('Error saving data to file:', error);
    }
}

async function main() {
    const apiUrl = 'https://harvest.greenhouse.io/v1/candidates';
    const apiKey = process.env.GREENHOUSE_API_KEY ?? "";
    const outputFile = 'greenhouse_linkedin_info.json'; 

    const candidates = await fetchCandidates(apiUrl, apiKey);
    const extractedInfo = extractLinkedInInfo(candidates);
    console.log(JSON.stringify(extractedInfo, null, 2));
    await saveToFile(extractedInfo, outputFile);
    console.log(`Total candidates: ${extractedInfo.length}`);
}

main();
