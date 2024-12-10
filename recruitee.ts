import axios from "axios";
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import Bottleneck from 'bottleneck';

dotenv.config();

const apiKey = process.env.RECRUITEE_API_KEY;
const apiCompanyId = process.env.RECRUITEE_API_COMPANY_ID;

const headers = {
  headers: { 
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
};

const limiter = new Bottleneck({
  minTime: 200,
  maxConcurrent: 5,
});

async function getOffers(): Promise<any[] | null> {

  let offers: any[] = [];
  
  try {
    const response = await axios.get(`https://api.recruitee.com/c/${apiCompanyId}/offers`, headers)
    offers = response.data.offers;   
    
    return offers;
  } catch (error) {
    console.log(`Failed to fetch Jobs data: ${error}`);
    return null;
  }
}

function findRecruiterById(recruiterId: number, followers: any) {
  const recruiter = followers.find((follower: any) => follower.id === recruiterId);
  return recruiter ? `${recruiter.email}` : null;
}

function findStagesById(candidates: any, jobs: any) {
  return candidates.map((candidate: any) => {
    const updatedPlacements = candidate.placements.map((placement: any) => {
      const job = jobs.find((job: any) => 
        job.pipeline_template?.stages?.some((stage: any) => stage.id === placement.stage_id)
      );
      if (job) {
        const stage = job.pipeline_template.stages.find((stage: any) => stage.id === placement.stage_id);
        if (stage) {
          return { ...placement, stage_name: stage.name };
        }
      }
      return placement;
    });
    return { ...candidate, placements: updatedPlacements };
  });
}

async function getCandidates(): Promise<any[] | null> {

  let candidates: any[] = [];
  
  try {
    const response = await axios.get(`https://api.recruitee.com/c/${apiCompanyId}/candidates`, headers)
    candidates = response.data.candidates;   
    
    return candidates;
  } catch (error) {
    console.log(`Failed to fetch Candidates data: ${error}`);
    return null;
  }
}

async function getNotes(candidateId: number): Promise<any | null> {
  
  let candidateNotes: any[] = [];
  try{
    const response = await axios.get(`https://api.recruitee.com/c/${apiCompanyId}/candidates/${candidateId}/notes`, headers);
    console.log(response.data);
    
    candidateNotes = response.data
    return candidateNotes
  } catch (error) {
    console.log(`Failed to fetch Notes data: ${error}`);
    return null;
  }

}

async function saveDataToFile(filename: string, data: any): Promise<void> {
  try {
    await fs.writeFile(filename, JSON.stringify(data, null, 2));
    console.log(`Data saved to ${filename}`);
  } catch (error) {
    const errorMessage = (error instanceof Error) ? error.message : 'Unknown error';
    console.error('Error saving data to file:', errorMessage);
    throw error;
  }
}

(async () => {

  console.log("Starting Recrutee API...");
  console.log(`Company ID: ${apiCompanyId}`);

  const jobs = await getOffers();

  if (jobs) {
    const jobsWithRecruiters = jobs.map(job => {
      const recruiterEmail = findRecruiterById(job.recruiter_id, job.followers)
      return {...job, recruiterEmail}
    })
    await saveDataToFile('recruitee_jobs.json',jobsWithRecruiters);
  }

  const candidates = await getCandidates();

  if (candidates && jobs) {
    const candidatesWithStages = findStagesById(candidates, jobs);
    
    const candidatesWithStagesAndNotes = await Promise.all(candidatesWithStages.map(async (candidate: any) => {
      console.log(`Fetching notes for candidate ${candidate.id}`);
      
      const notes = await getNotes(candidate.id)
      return {
        ...candidate,
        notes,
      };
    }));
    await saveDataToFile('recruitee_candidates.json', candidatesWithStagesAndNotes);
  }

})().catch(error => {
  console.error(error);
  process.exit(1);
});