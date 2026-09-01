import db from "@/lib/db";

export type DataTransferDirection = "INBOUND" | "OUTBOUND" | "BIDIRECTIONAL";

export interface DataTransferRequest {
  tenantId: string;
  peerSlug: string;
  resource: string;
  direction: DataTransferDirection;
}

export async function assertExplicitApiTransferGrant(request: DataTransferRequest): Promise<void> {
  const now = new Date();
  const grant = await db.apiTransferGrant.findFirst({
    where: {
      tenantId: request.tenantId,
      peerSlug: request.peerSlug,
      resource: request.resource,
      isEnabled: true,
      direction: { in: [request.direction, "BIDIRECTIONAL"] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  });

  if (!grant) {
    await db.apiTransferLog.create({
      data: {
        tenantId: request.tenantId,
        direction: request.direction,
        peerSlug: request.peerSlug,
        resource: request.resource,
        operation: "authorization_denied",
        success: false,
        error: "Missing explicit API transfer grant.",
      },
    });
    throw new Error("Transferencia bloqueada: falta una autorización API explícita para este recurso.");
  }

  await db.apiTransferGrant.update({
    where: { id: grant.id },
    data: { lastUsedAt: now },
  });
}
