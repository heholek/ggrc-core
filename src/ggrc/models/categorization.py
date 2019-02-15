# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module contains Categorization model and Categorizable mixin."""

from sqlalchemy.ext.associationproxy import association_proxy

from ggrc import db
from ggrc.models import reflection
from ggrc.models.mixins import base
from ggrc.models.mixins import Base

BACKREF_NAME_FORMAT = '{type}_{scope}_categorizable'


class Categorization(base.ContextRBAC, Base, db.Model):
  """Categorization model."""
  __tablename__ = 'categorizations'

  category_id = db.Column(
      db.Integer, db.ForeignKey('categories.id'), nullable=False)
  category_type = db.Column(db.String)
  categorizable_id = db.Column(db.Integer)
  categorizable_type = db.Column(db.String)

  @property
  def category_attr(self):
    return '{0}_category'.format(self.category_type)

  @property
  def category(self):
    return getattr(self, self.category_attr)

  @category.setter
  def category(self, value):
    self.category_id = value.id if value is not None else None
    self.category_type = value.__class__.__name__ if value is not None \
        else None
    return setattr(self, self.category_attr, value)

  @property
  def category_name(self):
    from ggrc.models.category import CategoryBase
    return CategoryBase.query.get(self.category_id).name

  _api_attrs = reflection.ApiAttributes(
      # 'categorizable',
      reflection.Attribute('category', create=False, update=False)
  )

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm
    query = super(Categorization, cls).eager_query()
    return query.options(
        orm.subqueryload('category'))

  def log_json(self):
    out_json = super(Categorization, self).log_json()
    out_json["display_name"] = self.category_name
    return out_json


class Categorizable(object):  # pylint: disable=too-few-public-methods
  """Subclasses **MUST** provide a declared_attr method that defines the
  relationship and association_proxy. For example:

  ..  code-block:: python

      @declared_attr
      def control_categorizations(cls):
        return cls.categorizations(
            'control_categorizations',
            'control_categories',
            100,
        )
  """

  # pylint: disable=unused-argument
  @classmethod
  def declare_categorizable(cls, category_type, single, plural, ation):
    """Class method that declare categorizable relationship."""
    setattr(
        cls, plural,
        association_proxy(
            ation, 'category',
            creator=lambda category: Categorization(
                category_id=category.id,
                category=category,
                category_type=category.__class__.__name__,
                categorizable_type=cls.__name__
            )
        )
    )

    joinstr = (
        'and_('
        'foreign(Categorization.categorizable_id) == {type}.id, '
        'foreign(Categorization.categorizable_type) == "{type}", '
        'foreign(Categorization.category_type) == "{category_type}"'
        ')'
    )
    joinstr = joinstr.format(type=cls.__name__, category_type=category_type)
    backref = '{type}_categorizable_{category_type}'.format(
        type=cls.__name__,
        category_type=category_type,
    )
    return db.relationship(
        'Categorization',
        primaryjoin=joinstr,
        backref=backref,
        cascade='all, delete-orphan',
    )