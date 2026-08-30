# AWS Implementation Steps

## Status: Superseded Before AWS Creation

The previous manual instruction to create a separate `ResortUsers` table is
superseded by the final single-table architecture. Do not create `ResortUsers`
or any other DynamoDB table from this file.

The approved initial application data store is one DynamoDB table named
`SmartResortTable`, containing logical `USER`, `ROOM`, `BOOKING`,
`SERVICE_REQUEST`, `ACTIVITY`, and `REVIEW` items. Its key and GSI design is
documented in [DYNAMODB-DESIGN.md](DYNAMODB-DESIGN.md).

No AWS Console instructions are provided in this design update because AWS
implementation is not authorized in this step. Do not access AWS, create an
AWS resource, add sample items, create credentials, or run AWS commands.

If `ResortUsers` was previously created manually, do not delete or alter it
based on this document. Record that external state and obtain explicit product
direction before any AWS change.
