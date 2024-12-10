import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';
import axios from 'axios';
import * as readline from 'readline';

dotenv.config();

const apiKey = process.env.BIZNEO_API_KEY;
const apiEmail = process.env.BIZNEO_API_EMAIL;

const headers = {
  headers: { 
    'Authorization': `Token token=${apiKey}, user_email=${apiEmail}`,
    'Content-Type': 'application/json'
  }
};

async function fetchCompanies():  Promise<number | null> {

  try { 

    const response = await axios.get("https://ats.bizneo.com/api/v3/users/companies", headers);
    const companies = response.data.companies;

    if (companies && companies.length > 0) {
      const companyId = companies[0].id;
      return companyId;
    }
       else {
          console.log("No companies found. Exiting...");
          return null;
    } 

  } catch(err) {
      console.log("Error retrieving companies: ", err)
      return null;
  }
}

async function fetchRecruiters(companyId: number):  Promise<any[] | null> {
  
  let page = 1;
  let allRecruiters: any[] = [];
  let currentPageData: number = 0;

    do {
      try { 
        const response = await axios.get(`https://ats.bizneo.com/api/v3/companies/${companyId}/recruiters?page=${page}`, headers);
        const recruiters = response.data.recruiters;
        currentPageData = recruiters.length;

        if (recruiters && recruiters.length > 0) {
          allRecruiters = allRecruiters.concat(recruiters);
          page++;
        }
      } catch(err) {
          console.log("Error retrieving jobs: ", err)
          return null;
      } 
    } while (currentPageData > 0)
    
    return allRecruiters;
}

async function fetchJobs(companyId: number, recruiters: any[] | null):  Promise<any[] | null> {
  
  let page = 1;
  let allJobs: any[] = [];
  let currentPageData: number = 0;

    do {
      try { 
        const response = await axios.get(`https://ats.bizneo.com/api/v3/companies/${companyId}/jobs?page=${page}`, headers);
        const jobs = response.data.jobs;
        currentPageData = jobs.length;

        if (jobs && jobs.length > 0) {
          allJobs = allJobs.concat(jobs);
          page++;
        }
      } catch(err) {
          console.log("Error retrieving jobs: ", err)
          return null;
      } 
    } while (currentPageData > 0)
    
    if (recruiters && recruiters.length > 0) {
      allJobs.forEach(job => {
        recruiters.forEach (recruiter => {
          if(recruiter.id === job.owner_id) {
            job.owner_email = recruiter.email
          }
        })
      })
    }

    return allJobs;

}

async function fetchCandidates(job: number, companyId: number): Promise<any[] | null> {

  let page = 1;
  let allApplications: any[] = [];
  let currentPageData: number = 0;

  do {
    try {
      console.log(`Retrieving applications from job ${job} | Page ${page}...`);
      
      const response = await axios.get(`https://ats.bizneo.com/api/v3/companies/${companyId}/jobs/${job}/candidates?page=${page}`, headers);
      const applications = response.data.candidates;
      currentPageData = applications.length;

      if (applications && applications.length > 0) {
        allApplications = allApplications.concat(applications);
        page++;
      }
    }  catch(err) {
      console.log("Error retrieving applications: ", err)
      return null;
    } 
  } while (currentPageData > 0)
      
  return allApplications

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

    console.log("Starting...");
    const companyId = await fetchCompanies();
    const recruiters = companyId ? await fetchRecruiters(companyId) : null;
    const jobs = companyId ? await fetchJobs(companyId, recruiters) : null;
    
    console.log("Finished retrieving Jobs...");

    await saveDataToFile('bizneo_recruiters.json', recruiters);
    await saveDataToFile('bizneo_jobs.json', jobs);
    console.log(`Jobs saved.`);

    if (jobs && jobs.length > 0 && companyId) {
      const applications: any[] = await Promise.all(
        jobs.map(async(job)=> {
          const jobApplications = await fetchCandidates(job.id, companyId); 
          return {
            jobId: job.id,
            applications: jobApplications
          }
        })
      )
      await saveDataToFile('bizneo_applications.json', applications);
      console.log('Applications saved to applications.json');
    }

  })().catch(error => {
    console.error(error);
    process.exit(1);
  });
  