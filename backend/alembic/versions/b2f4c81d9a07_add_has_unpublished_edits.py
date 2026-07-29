"""add forms.has_unpublished_edits

Backs the builder's "Publish edits" button: a live form that has been edited since
its last publish needs to say so.

Existing rows default to 0 — a form already in the database has, by definition,
nothing pending.

Uses a plain add_column, NOT batch_alter_table. Batch mode copies the table and
drops the original, and `forms` is the parent of questions and responses via
ON DELETE CASCADE — so dropping it takes every question and response with it.
That is not hypothetical: the first version of this migration did exactly that.
SQLite supports ALTER TABLE ... ADD COLUMN natively, so no rebuild is needed.

Revision ID: b2f4c81d9a07
Revises: 77a1a10785c4
Create Date: 2026-07-29 00:00:00.000000

"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = 'b2f4c81d9a07'
down_revision: Union[str, None] = '77a1a10785c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'forms',
        sa.Column(
            'has_unpublished_edits',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('0'),
        ),
    )


def downgrade() -> None:
    op.drop_column('forms', 'has_unpublished_edits')
