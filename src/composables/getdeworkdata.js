import axios from 'axios';

export async function useGetDeworkData(workspace) {
  try {
    const response = await axios.post('/.netlify/functions/getDeworkData', { workspace });
    return response.data;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}
