import axios from 'axios';

function getPrefix(organizationName) {
  const lowercaseName = organizationName.toLowerCase();
  if (lowercaseName.includes('singularitynet ambassador program')) {
    return 'snet';
  } else if (lowercaseName.includes('swarm')) {
    return 'swarm';
  } else {
    // Handle other cases or return a default
    return 'defaultPrefix';
  }
}

function transformWorkspaces(workspaces, organizationName) {
  const prefix = getPrefix(organizationName);
  let result = {};

  workspaces.forEach(workspace => {
    const key = prefix + workspace.name.replace(/[^\w\s]/gi, '').replace(/\s+/g, '');
    result[key] = {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      tasks: []
    };
  });

  return result;
}


export async function useGetOrganizationDetails(organizationId) {
  const query = `
  query GetOrganizationDetailsQuery {
    getOrganization(id: "${organizationId}") {
      name
      workspaces {
        id
        name
        slug
      }
    }
  }
  `;

  const variables = {
    organizationId,
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': import.meta.env.VITE_DEWORK_AUTH,
  };

  try {
    const response = await axios.post('https://api.deworkxyz.com/graphql?op=GetOrganizationDetailsQuery', {
      query,
      variables,
    }, {
      headers,
    });

    const organization = response.data.data.getOrganization;
    const transformedWorkspaces = transformWorkspaces(organization.workspaces, organization.name);

    return transformedWorkspaces;
    //return response.data;
  } catch (error) {
    console.error('Error fetching organization details:', error);
  }
}