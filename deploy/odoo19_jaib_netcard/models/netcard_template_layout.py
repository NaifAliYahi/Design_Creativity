# -*- coding: utf-8 -*-
import json

from odoo import api, fields, models, _
from odoo.exceptions import ValidationError

# أنواع الطبقات كما في React: name | code | phone | image
LAYER_TYPES = ("name", "code", "phone", "image")


class NetcardTemplateLayout(models.Model):
    """مواقع وخصائص الليبلات لكل قالب — يُصدَّر من bundled-layouts.json."""

    _name = "netcard.template.layout"
    _description = "Netcard Template Layout"
    _order = "write_date desc"

    name = fields.Char(string="الوصف", compute="_compute_name", store=True)
    template_id = fields.Many2one(
        "netcard.template",
        string="القالب المدمج",
        ondelete="cascade",
        index=True,
    )
    custom_template_id = fields.Many2one(
        "netcard.custom.template",
        string="قالب مستورد",
        ondelete="cascade",
        index=True,
    )
    template_code = fields.Char(
        string="رمز القالب",
        compute="_compute_template_code",
        store=True,
        index=True,
    )
    layers_json = fields.Json(
        string="طبقات (JSON)",
        default=list,
        help="مصفوفة DesignLayer — x, y, fontSize, color, type, rotation…",
    )
    layers_text = fields.Text(
        string="طبقات (نص)",
        compute="_compute_layers_text",
        inverse="_inverse_layers_text",
        help="للتحرير اليدوي أو الاستيراد من bundled-layouts.json.",
    )
    background_url = fields.Char(
        string="رابط الخلفية",
        help="اختياري — إن وُجد في التصدير القديم.",
    )
    version = fields.Integer(string="إصدار", default=1)
    company_id = fields.Many2one(
        "res.company",
        string="الشركة",
        default=lambda self: self.env.company,
        index=True,
    )
    last_editor_id = fields.Many2one(
        "res.users",
        string="آخر مُعدّل",
        readonly=True,
    )

    @api.depends("template_id", "template_id.name", "custom_template_id", "custom_template_id.name")
    def _compute_name(self):
        for rec in self:
            if rec.template_id:
                rec.name = rec.template_id.name
            elif rec.custom_template_id:
                rec.name = rec.custom_template_id.name
            else:
                rec.name = _("تخطيط جديد")

    @api.depends("template_id.code", "custom_template_id.id")
    def _compute_template_code(self):
        for rec in self:
            if rec.template_id:
                rec.template_code = rec.template_id.code
            elif rec.custom_template_id:
                rec.template_code = "custom-%s" % rec.custom_template_id.id
            else:
                rec.template_code = False

    @api.constrains("template_id", "custom_template_id")
    def _check_template_link(self):
        for rec in self:
            if not rec.template_id and not rec.custom_template_id:
                raise ValidationError(_("اربط التخطيط بقالب مدمج أو مستورد."))
            if rec.template_id and rec.custom_template_id:
                raise ValidationError(_("لا يمكن ربط التخطيط بقالبين في نفس الوقت."))

    @api.depends("layers_json")
    def _compute_layers_text(self):
        for rec in self:
            data = rec.layers_json or []
            rec.layers_text = json.dumps(data, ensure_ascii=False, indent=2)

    def _inverse_layers_text(self):
        for rec in self:
            if not rec.layers_text:
                rec.layers_json = []
                continue
            try:
                parsed = json.loads(rec.layers_text)
            except json.JSONDecodeError as exc:
                raise ValidationError(_("JSON غير صالح: %s") % exc) from exc
            if not isinstance(parsed, list):
                raise ValidationError(_("يجب أن يكون JSON مصفوفة []"))
            rec.layers_json = parsed

    @api.constrains("layers_json")
    def _check_layers_json(self):
        for rec in self:
            layers = rec.layers_json
            if layers is None:
                continue
            if not isinstance(layers, list):
                raise ValidationError(_("layers_json يجب أن تكون قائمة."))
            for idx, layer in enumerate(layers):
                if not isinstance(layer, dict):
                    raise ValidationError(_("طبقة %s ليست كائناً.") % idx)
                ltype = layer.get("type")
                if ltype and ltype not in LAYER_TYPES:
                    raise ValidationError(
                        _("نوع طبقة غير مدعوم: %s (المسموح: name, code, phone, image)") % ltype
                    )

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            vals.setdefault("last_editor_id", self.env.user.id)
        return super().create(vals_list)

    def write(self, vals):
        if "layers_json" in vals or "layers_text" in vals:
            vals = dict(vals, last_editor_id=self.env.user.id)
            if "layers_json" in vals and "version" not in vals:
                for rec in self:
                    vals.setdefault("version", (rec.version or 0) + 1)
        return super().write(vals)

    def get_public_layout_payload(self):
        """للواجهة العامة /design — بدون بيانات حساسة."""
        self.ensure_one()
        return {
            "template_code": self.template_code,
            "layers": self.layers_json or [],
            "background_url": self.background_url or False,
            "version": self.version,
        }
