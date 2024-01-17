const axios = require('axios');

exports.handler = async function(event) {
  const workspace = JSON.parse(event.body).workspace;
  const query = `
  query GetWorkspaceTasksQuery {
    getWorkspace(id: "${workspace}") {
      id
      tasks(filter: { statuses: [IN_REVIEW] }) {
        id
        status
        tags {
          id
          label
          color
        }
        workspaceId
      }
    }
  }
`;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': process.env.VITE_DEWORK_AUTH,
  };

  try {
    const response = await axios.post('https://api.deworkxyz.com/graphql?op=GetWorkspaceTasksQuery', {
      query,
    }, {
      headers,
    });

    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error('Error fetching data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch data' }),
    };
  }
};
