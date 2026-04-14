from app.models.customer import Customer
from app.core.logging import logger

class CRMService:
    async def sync_customer(self, customer: Customer):
        """
        Placeholder for CRM synchronization logic.
        Sends: Name, Phone, Source (Refer, TCB, Ads...)
        """
        logger.info(f"SYNC CRM: Syncing customer {customer.name} ({customer.phone})")
        
        # Mock payload
        payload = {
            "name": customer.name,
            "phone": customer.phone,
            "source": customer.source.name if customer.source else "N/A"
        }
        
        # TODO: Implement actual API call to external CRM
        logger.info(f"SYNC CRM: Data payload: {payload}")
        return True

crm_service = CRMService()
