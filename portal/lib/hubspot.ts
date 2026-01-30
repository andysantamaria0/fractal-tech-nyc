import * as hubspot from '@hubspot/api-client'
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/companies/models/Filter'
import { FilterOperatorEnum as ContactFilterOp } from '@hubspot/api-client/lib/codegen/crm/contacts/models/Filter'
import { AssociationSpecAssociationCategoryEnum } from '@hubspot/api-client/lib/codegen/crm/associations/v4/models/AssociationSpec'
import { AssociationSpecAssociationCategoryEnum as NoteAssocCategory } from '@hubspot/api-client/lib/codegen/crm/objects/notes/models/AssociationSpec'

const hubspotClient = new hubspot.Client({
  accessToken: process.env.HUBSPOT_API_KEY,
})

export async function findCompanyByDomain(domain: string) {
  const response = await hubspotClient.crm.companies.searchApi.doSearch({
    filterGroups: [
      {
        filters: [
          {
            propertyName: 'domain',
            operator: FilterOperatorEnum.Eq,
            value: domain,
          },
        ],
      },
    ],
    sorts: [],
    properties: [],
    limit: 1,
    after: '0',
  })

  return response.results?.[0] ?? null
}

export async function createCompany(properties: {
  name: string
  domain?: string
  linkedin_company_page?: string
}) {
  const response = await hubspotClient.crm.companies.basicApi.create({
    properties,
    associations: [],
  })
  return response
}

export async function findContactByEmail(email: string) {
  const response = await hubspotClient.crm.contacts.searchApi.doSearch({
    filterGroups: [
      {
        filters: [
          {
            propertyName: 'email',
            operator: ContactFilterOp.Eq,
            value: email,
          },
        ],
      },
    ],
    sorts: [],
    properties: [],
    limit: 1,
    after: '0',
  })

  return response.results?.[0] ?? null
}

export async function createOrUpdateContact(properties: {
  email: string
  firstname: string
  lastname: string
  linkedin_profile?: string
}) {
  const existing = await findContactByEmail(properties.email)

  if (existing) {
    await hubspotClient.crm.contacts.basicApi.update(existing.id, {
      properties,
    })
    return existing.id
  }

  const response = await hubspotClient.crm.contacts.basicApi.create({
    properties,
    associations: [],
  })
  return response.id
}

export async function associateContactToCompany(
  contactId: string,
  companyId: string
) {
  await hubspotClient.crm.associations.v4.basicApi.create(
    'contacts',
    contactId,
    'companies',
    companyId,
    [
      {
        associationCategory: AssociationSpecAssociationCategoryEnum.HubspotDefined,
        associationTypeId: 1,
      },
    ]
  )
}

export async function createNote(body: {
  content: string
  contactId?: string
  companyId?: string
}) {
  const associations: Array<{
    to: { id: string }
    types: Array<{
      associationCategory: NoteAssocCategory
      associationTypeId: number
    }>
  }> = []

  if (body.contactId) {
    associations.push({
      to: { id: body.contactId },
      types: [
        {
          associationCategory: NoteAssocCategory.HubspotDefined,
          associationTypeId: 202,
        },
      ],
    })
  }

  if (body.companyId) {
    associations.push({
      to: { id: body.companyId },
      types: [
        {
          associationCategory: NoteAssocCategory.HubspotDefined,
          associationTypeId: 190,
        },
      ],
    })
  }

  const response = await hubspotClient.crm.objects.notes.basicApi.create({
    properties: {
      hs_note_body: body.content,
      hs_timestamp: new Date().toISOString(),
    },
    associations,
  })

  return response.id
}
