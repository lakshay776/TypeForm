"""add forms.has_unpublished_edits"""
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
